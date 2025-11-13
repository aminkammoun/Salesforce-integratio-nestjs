import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { handleQuery } from 'src/config/utils';
import { Child } from '../entities/child.entity';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types as MongooseTypes } from 'mongoose';
import { CreateChildDto } from '../dto/create-child.dto';
import type { ChildToreserve } from 'src/config/types';
import { Sponsorship } from 'src/modules/sponsorship/entities/sponsorship.entity';
import { SponsorshipService } from 'src/modules/sponsorship/service/sponsorship.service';

@Injectable()
export class ChildService {
    constructor(
        @InjectModel(Child.name) private readonly ChildModel: Model<Child>,
        @Inject() private readonly sponsorshipService: SponsorshipService,
    ) { }
    async findAll(query: string) {
        const res = await handleQuery('/services/data/v65.0/query/?q=', query);
        let childCollec: CreateChildDto[] = [];
        console.log('Service received response:', res);
        if (res.done == true) {
            childCollec = res.records.map(record => {
                return {
                    SalesforceID: record.Id,
                    Child_Name__c: record.Child_Name__c,
                    NationalityList__c: record.NationalityList__c,
                    Age__c: record.Age_Calculated__c,
                    Status__c: record.Status__c,
                    url: record.attributes.url
                };
            });
        }

        if (childCollec.length > 0) {
            try {
                // Filter out records that already exist by SalesforceID
                const existing = await this.ChildModel.find({ SalesforceID: { $in: childCollec.map(c => c.SalesforceID) } }, { SalesforceID: 1 }).lean();
                const existingIds = new Set(existing.map(e => e.SalesforceID));
                const toInsert = childCollec.filter(c => !existingIds.has(c.SalesforceID));
                if (toInsert.length > 0) {
                    await this.ChildModel.insertMany(toInsert, { ordered: false });
                }
                console.log('Children to be inserted into DB:', childCollec);

            } catch (error) {
                console.error('Error inserting children:', error);
            }
        }
        return childCollec;
    }
    async create(createChild: CreateChildDto[]) {
        try {
            const createdChildren = await this.ChildModel.insertMany(createChild, { ordered: false });
            return createdChildren;
        } catch (error) {
            console.error('Error inserting children:', error);
            return { message: 'Error inserting some or all children', errorDetails: error };
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

    async reserveChildren(childToreserve: ChildToreserve[], donorId: string) {
        const session: ClientSession = await this.ChildModel.db.startSession();
        session.startTransaction();
        try {
            const reservationResults: { message: string; nationality: string; reservedCount: number; }[] = [];
            var reservedIDs: string[] = [];
            for (const req of childToreserve) {
                const nat = req.nationality;
                const count = Number((req as any).Requestedcount) || 0;
                const availableChildren = await this.ChildModel.find({ NationalityList__c: nat, Status__c: 'Available' }).limit(count)//.session(session);
                const reservedIds = availableChildren.map(child => String(child._id));
                reservedIDs.push(...reservedIds);
                console.log(reservedIDs);
                await this.ChildModel.updateMany(
                    { _id: { $in: reservedIds } },
                    { $set: { Status__c: 'Reserved', reservedAt: new Date() } }
                );
                if (reservedIds.length == 0) {
                    reservationResults.push({ message: 'No available children to be sponsored for nationality ' + nat, nationality: nat, reservedCount: reservedIds.length });

                } else {
                    reservationResults.push({ message: reservedIds.length + ' ' + nat + ' children has been sponsored', nationality: nat, reservedCount: reservedIds.length });
                }
            }
            if (reservedIDs.length > 0) {
                console.log('Reserved Children IDs:', reservedIDs);
                // Step 2: Create Sponsorship record

                const sp = await this.sponsorshipService.create({
                    donation: "690343f2d441305855664416",
                    donor: donorId,
                    child: reservedIDs,
                    Status: 'pending',
                })
                await session.commitTransaction();
                session.endSession();
                return sp[0];
            }

            return reservationResults;
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
}
