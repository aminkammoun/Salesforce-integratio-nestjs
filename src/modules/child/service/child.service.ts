import { Injectable } from '@nestjs/common';
import { handleQuery } from 'src/config/utils';
import { Child } from '../entities/child.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types as MongooseTypes } from 'mongoose';
import { CreateChildDto } from '../dto/create-child.dto';


@Injectable()
export class ChildService {
    constructor(
        @InjectModel(Child.name) private readonly ChildModel: Model<Child>,
    ) { }
    async findAll(query: string) {
        const res = await handleQuery('/services/data/v65.0/query/?q=', query);
        let childCollec = [];
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
                await this.ChildModel.insertMany(childCollec, { ordered: false });
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

    async getChildrenByNationality() {
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
                            count: { $ifNull: ['$approvedCount.count', 0] }
                        }
                    },
                    // Sort by count descending
                    {
                        $sort: {
                            count: -1
                        }
                    }
            ]);

            return nationalityCounts;
        } catch (error) {
            console.error('Error getting children by nationality:', error);
            throw error;
        }
    }

}
