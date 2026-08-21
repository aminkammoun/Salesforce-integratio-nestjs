import { Inject, Injectable } from '@nestjs/common';


@Injectable()
export class NeondbService {
    constructor(@Inject('POSTGRES_POOL') private readonly sql: any) { }
    async getTable() {
        return await this.sql`SELECT * FROM campaigns`;
    }
    async createCampaign(campaignData: any) {
        const keys = Object.keys(campaignData);
        const columns = keys.join(', ');
        const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
        const values = keys.map((key) => campaignData[key]);

        const result = await this.sql.query(
            `INSERT INTO campaigns (${columns}) VALUES (${placeholders}) RETURNING *`,
            values,
        );

        return result;
    }
}