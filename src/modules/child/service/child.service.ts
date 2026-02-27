import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { authenticateSalesforce, fetchAllSalesforceContacts, handleInsertQuery, handleQuery } from 'src/config/utils';
import { Child } from '../entities/child.entity';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types as MongooseTypes } from 'mongoose';
import { CreateChildDto } from '../dto/create-child.dto';
import type { ChildToreserve, SponsorshipChilds, childAttachment } from 'src/config/types';
import { Sponsorship } from 'src/modules/sponsorship/entities/sponsorship.entity';
import { SponsorshipService } from 'src/modules/sponsorship/service/sponsorship.service';

@Injectable()
export class ChildService {
    constructor(
        @InjectModel(Child.name) private readonly ChildModel: Model<Child>,
        @Inject() private readonly sponsorshipService: SponsorshipService,
    ) { }
    async findAll(query: string) {
        const token = await authenticateSalesforce();
        const res = await handleQuery('/services/data/v65.0/query/?q=', query, token);
        let childCollec: CreateChildDto[] = [];
        console.log('Service received response:', res);
        if (res.done === true && Array.isArray(res.records) && res.records.length) {
            childCollec = res.records.map(record => ({
                SalesforceID: record.Id,
                Child_Name__c: record.Child_Name__c,
                NationalityList__c: record.NationalityList__c,
                Age__c: record.Age_Calculated__c,
                Status__c: record.Status__c,
                url: record.attributes?.url,
            }));
            console.log('Mapped child records:', childCollec);

            // Avoid inserting duplicates: check which SalesforceIDs already exist
            const salesforceIds = childCollec.map(c => c.SalesforceID);
            const existing = await this.ChildModel.find({ SalesforceID: { $in: salesforceIds } }, { SalesforceID: 1 }).lean();
            const existingIds = new Set(existing.map(e => String(e.SalesforceID)));
            const toInsert = childCollec.filter(c => !existingIds.has(String(c.SalesforceID)));

            if (toInsert.length === 0) {
                console.log('No new children to insert; all records already exist.');
            } else {
                try {
                    const created = await this.create(toInsert);
                    console.log(`Inserted ${Array.isArray(created) ? created.length : 0} new children.`);
                } catch (err) {
                    console.error('Error inserting children from Salesforce response:', err);
                }
            }
        } else {
            console.log('No records to process from Salesforce response.');
        }
    }
    async insertFromSalesforce(query: string) {
        const records = await fetchAllSalesforceContacts(query);
        const operations = records.map((record: any) => ({
            updateOne: {
                filter: { SalesforceID: record.Id },
                update: {
                    $set: {
                        SalesforceID: record.Id,
                        Child_Name__c: record.Child_Name__c,
                        NationalityList__c: record.NationalityList__c,
                        Age__c: record.Age_Calculated__c,
                        Profile_Picture__c: record.Profile_Picture__c,
                        Status__c: record.Status__c,
                        url: record.attributes?.url,
                    }
                },
                upsert: true
            }

        }));
        const result = await this.ChildModel.bulkWrite(operations, { ordered: false });

        console.log('Imported children:', result);
        return result;

    }
    async create(createChild: CreateChildDto[]) {
        try {
            console.log('Inserting children:', createChild);
            const createdChildren = await this.ChildModel.create(createChild, { ordered: false });

            return createdChildren;
        } catch (error) {
            console.error('Error inserting children:', error);
            return { message: 'Error inserting some or all children', errorDetails: error };
        }
    }
    async getAvailableChildrenCount() {
        try {
            const count = await this.ChildModel.countDocuments({ Status__c: 'Available' });
            return { availableChildrenCount: count };
        } catch (error) {
            console.error('Error getting available children count:', error);
            throw new InternalServerErrorException(error);
        }
    }
    async getMostNededNationalities() {
        try {
            const result = await this.ChildModel.aggregate([
                {
                    $match: { Status__c: 'Available' }
                },
                {
                    $group: {
                        _id: '$NationalityList__c',
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { count: -1 }
                },
                {
                    $limit: 1
                },
                {
                    $project: {
                        nationality: '$_id',
                        availableCount: '$count',
                        _id: 0
                    }
                }
            ]);

            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error getting most needed nationalities:', error);
            throw new InternalServerErrorException(error);
        }
    }
    async getAvailableChildrenByNationality(childToreserve: ChildToreserve[]) {
        try {
            const nationalityCounts = await this.ChildModel.aggregate([
                // First get all unique nationalities
                {
                    $group: {
                        _id: '$NationalityList__c'
                    }
                },
                // Convert to a standard format
                {
                    $project: {
                        nationality: '$_id',
                        _id: 0
                    }
                },
                // Do a left join with the approved children counts
                {
                    $lookup: {
                        from: 'children',
                        let: { nationality: '$nationality' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$NationalityList__c', '$$nationality'] },
                                            { $eq: ['$Status__c', 'Available'] }
                                        ]
                                    }
                                }
                            },
                            {
                                $count: 'count'
                            }
                        ],
                        as: 'approvedCount'
                    }
                },
                // Unwind the array created by lookup (will be empty for nationalities with no approved children)
                {
                    $unwind: {
                        path: '$approvedCount',
                        preserveNullAndEmptyArrays: true
                    }
                },
                // Set the final count, using 0 for nationalities with no approved children
                {
                    $project: {
                        nationality: 1,
                        Availablecount: { $ifNull: ['$approvedCount.count', 0] }
                    }
                },
                // Sort by count descending
                {
                    $sort: {
                        count: -1
                    }
                }
            ]);

            console.log(nationalityCounts)
            console.log(childToreserve);

            // Build a map of available counts by nationality (case-insensitive key)
            const availableMap: Record<string, number> = {};
            for (const row of nationalityCounts) {
                const key = String(row.nationality).toLowerCase();
                availableMap[key] = Number(row.Availablecount) || 0;
            }

            // Prepare result comparing requested vs available
            const comparison = (childToreserve || []).map(req => {
                const natKey = String(req.nationality || '').toLowerCase();
                const available = availableMap[natKey] ?? 0;
                const requested = Number((req as any).Requestedcount) || 0;
                const ok = requested <= available;
                return {
                    nationality: req.nationality,
                    Requestedcount: requested,
                    Availablecount: available,
                    ok,
                    deficit: ok ? 0 : requested - available,
                };
            });

            // Also include nationalities that are available but not requested (optional)
            const extras = Object.keys(availableMap).filter(k => !(childToreserve || []).some(r => String(r.nationality || '').toLowerCase() === k))
                .map(k => ({ nationality: nationalityCounts.find(r => String(r.nationality).toLowerCase() === k)?.nationality || k, Requestedcount: 0, Availablecount: availableMap[k], ok: true, deficit: 0 }));

            const result = {
                comparison,
                availableOnly: extras,
            };

            console.log('Nationality availability comparison result:', result);

            return result;
        } catch (error) {
            console.error('Error getting children by nationality:', error);
            throw error;
        }
    }

    //async reserveChildren(childToreserve: ChildToreserve[], donorId: string, donationId: string,frequency:string,amount: number) {
    async reserveChildren(childToreserve: SponsorshipChilds[]) {
        const session: ClientSession = await this.ChildModel.db.startSession();
        session.startTransaction();
        try {
            const reservationResults: { message: string; nationality: string; reservedCount: number; }[] = [];
            const finalResult: any[] = []
            for (const childmap of childToreserve) {
                console.log('Processing reservation for:', childmap.child);
                if (childmap.child && childmap.child.length > 0) {
                    // If specific children are provided, try to reserve them directly
                    console.log('Reserving specific children:', childmap.child);
                    const sp = await this.sponsorshipService.create({
                        donation: childmap.donationId,
                        donor:  childmap.donorId,
                        child: childmap.child,
                        Status: 'Active',
                        frequency: childmap.frequency,
                        Amount: childmap.Amount,
                        Donor__c: childmap.donor__c,
                    })
                    this.updateToSponsored(childmap.child);

                    finalResult.push(sp)
                    continue;
                }

                var reservedIDs: string[] = [];
                for (const req of childmap.childToreserve) {
                    var nat = req.nationality;
                    if (nat == 'whereMostNeeded') {
                        console.log('where most needed requested');
                        const mostNeeded = await this.getMostNededNationalities();
                        nat = mostNeeded.nationality

                    }
                    const count = Number((req as any).Requestedcount) || 0;
                    const availableChildren = await this.ChildModel.find({ NationalityList__c: nat, Status__c: 'Available' }).limit(count)//.session(session);
                    const reservedIds = availableChildren.map(child => String(child.SalesforceID));
                    reservedIDs.push(...reservedIds);
                    console.log(reservedIDs);

                    if (reservedIds.length == 0 || availableChildren.length < count) {
                        const sp = await this.sponsorshipService.create({
                            donation: childmap.donationId,
                            donor:  childmap.donorId,
                            child: [],
                            Status: 'Active',
                            frequency: childmap.frequency,
                            Amount: childmap.Amount,
                            Donor__c: childmap.donor__c,
                            metadata: 'No available children to be sponsored for nationality ' + nat + ', reservedCount: ' + count
                        })
                        finalResult.push(sp)
                        continue;
                        /*reservationResults.push({ message: 'No available children to be sponsored for nationality ' + nat, nationality: nat, reservedCount: reservedIds.length });
                        return { message: 'No available children to be sponsored for nationality ' + nat, nationality: nat, reservedCount: reservedIds.length };
                    */
                    } else if (availableChildren.length < count) {
                        reservationResults.push({ message: 'Not enought available children to be sponsored for nationality ' + nat, nationality: nat, reservedCount: reservedIds.length });
                        return { message: 'Not enought available children to be sponsored for nationality ' + nat, nationality: nat, reservedCount: reservedIds.length };
                    } else {
                        await this.ChildModel.updateMany(
                            { SalesforceID: { $in: reservedIds } },
                            { $set: { Status__c: 'Sponsored', reservedAt: new Date() } }
                        );
                        reservationResults.push({ message: reservedIds.length + ' ' + nat + ' children has been sponsored', nationality: nat, reservedCount: reservedIds.length });
                    }

                }

                if (reservedIDs.length > 0) {
                    console.log('Reserved Children IDs:', reservedIDs);
                    // Step 2: Create Sponsorship record

                    const sp = await this.sponsorshipService.create({
                        donation: childmap.donationId,
                        donor: childmap.donorId,
                        child: reservedIDs,
                        Status: 'Active',
                        frequency: childmap.frequency,
                        Amount: childmap.Amount,
                        Donor__c: childmap.donor__c
                    })
                    await session.commitTransaction();
                    session.endSession();
                    console.log('Created Sponsorship:', sp);
                    finalResult.push(sp)

                }
            }
            return finalResult;

        } catch (error) {
            console.error('Error reserving children:', error);
            throw error;
        }
    }
    async updateChild(id: string, updateChildDto: Partial<CreateChildDto>) {
        try {
            const child = await this.ChildModel.findByIdAndUpdate(
                new MongooseTypes.ObjectId(id),
                { $set: updateChildDto },
                { new: true },
            );
            if (!child) {
                throw new NotFoundException('donation does not exists');
            }


            await child.save();
            return child;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async updateToSponsored(childIds: string[]) {
        try {
            const result = await this.ChildModel.updateMany(
                { SalesforceID: { $in: childIds } },
                { $set: { Status__c: 'Sponsored' } }
            );
            return result;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async findBySalesforceIDs(salesforceIDs: string[]) {
        try {
            const children = await this.ChildModel.find({ SalesforceID: { $in: salesforceIDs } });
            return children;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async markAsAvailable(ids : string[]) {
        try {
            const result = await this.ChildModel.updateMany(
                {
                    Status__c: "Sponsored", SalesforceID: { $in: ids }
                }
                ,
                { $set: { Status__c: 'Available' } }
            );
            return result;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async uploadChildAttachmentsToSalesforce(childAttachment: childAttachment) {
        try {
            const token = await authenticateSalesforce();
            const payload: any = {
                Child__c: childAttachment.Child__c,
                Name: childAttachment.Name,
                Type__c: childAttachment.Type__c,
                Youtube_Link__c: childAttachment.Youtube_Link__c,
                File_URL__c: childAttachment.File_URL__c,
            };
            const result = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Child_Attachment__c/', payload, token);
            console.log('Salesforce upload result for child attachment:', result);
            return result;

        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async retrieveAttachmentsFromSalesforce(childId: string) {
        try {
            const query = `SELECT Id, Name, Type__c, Youtube_Link__c, File_URL__c FROM Child_Attachment__c WHERE Child__c= '${childId}' AND Send_to_Web__c= true`;
            const token = await authenticateSalesforce();
            const res = await handleQuery('/services/data/v65.0/query/?q=', query, token);
            return res.records;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async checkChildStatus(salesforceID: string) {
        try {
            const child = await this.ChildModel.findOne({ SalesforceID: salesforceID });
            if (!child) {
                throw new NotFoundException('Child does not exist');
            }
            return { [child.SalesforceID]: child.Status__c === 'Sponsored' ? true : false };
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async giveAllChildrenStatus() {
        try {
            const children = await this.ChildModel.find({}, { SalesforceID: 1, Status__c: 1, _id: 0 });
            const result = children.map(child => ({ [child.SalesforceID]: child.Status__c === 'Sponsored' ? true : false }));
            return result;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async sponsorList(page: number = 1, limit: number = 10) {
        try {
            const skip = (page - 1) * limit;
            const children = await this.ChildModel.find({ synched: false, Status__c: 'Available' })
                .skip(skip)
                .limit(limit);
            const total = await this.ChildModel.countDocuments({ synched: false, Status__c: 'Available' });

            // Update synched status to true
            const childIds = children.map(child => child._id);
            if (childIds.length > 0) {
                await this.ChildModel.updateMany(
                    { _id: { $in: childIds } },
                    { $set: { synched: true } }
                );
            }

            return {
                data: children,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
    async updateSynchedStatus(synched: boolean) {
        try {
            const result = await this.ChildModel.updateMany(
                { synched: { $ne: synched } },
                { $set: { synched } }
            );
            return result;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }
}
