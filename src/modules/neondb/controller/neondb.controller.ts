import { Body, Controller, Get, Post } from '@nestjs/common';
import { NeondbService } from '../service/neondb.service';

@Controller('neondb')
export class NeondbController {
    constructor(private readonly appService: NeondbService) { }
    @Get('/')
    async getTable() {
        return this.appService.getTable();
    }
    @Post('/create')
    async createCampaign(@Body() campaignData: any) {
        return this.appService.createCampaign(campaignData);
    }
}