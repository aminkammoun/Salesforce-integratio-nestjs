import { Body, Controller, Get, Post, Param, Query, Request, Res } from '@nestjs/common';
import { SalesforceService } from '../service/salesforce.service';
@Controller('salesforce')
export class SalesforceController {
    constructor(private readonly salesforceService: SalesforceService) { }

    @Get()
    findAll(): string {
        return 'This action returns all cats';
    }
    @Get('/Amine')
    findOne(): string {
        return 'This action returns all Amine';
    }
    @Post('/getAccount')
    getAcount() {
        return this.salesforceService.getAccount();
    }
    @Post('/createAccount')
    createAccount() {
        return this.salesforceService.createAccount();
    }
    @Post('/createAccount2')
    createAccount2() {
        return this.salesforceService.createAccount2();
    }
    @Post('/wh')
    stripWebhook(@Request() req: any, @Res() res: any) {
        console.log('Received webhook data:',);
        return this.salesforceService.stripWebhook(req, res);

    }

    @Get('/customers')
    async getCustomers() {
        return await this.salesforceService.getCustomers();
    }
    @Post('/createPaymentIntent')
    async createPaymentIntent(@Request() req: any, @Res() res: any) {
        return await this.salesforceService.createPaymentIntent(req.body, res);
    }
    @Post('/getTerminalToken')
    async getTerminalToken(@Res() res: any) {
        return await this.salesforceService.createTerminalReader(res);
    }
    @Post('/retrievePaymentIntent')
    async retrievePaymentIntent(@Body() body: any) {
        return await this.salesforceService.retrievePaymentIntent(body.id);
    }
    @Post('/getPaymentMethods')
    async getPaymentMethods(@Body() req: any) {
        return await this.salesforceService.collectPaymentMethod(req.readerId,req.paymentIntentId);
    }

    @Get('users/:userId/campaigns')
    async getUserCampaigns(
        @Param('userId') userId: string,
        @Query('page') page?: number,
        @Query('per_page') perPage?: number,
    ) {
        return await this.salesforceService.getUserCampaigns(userId, page, perPage);
    }

    @Get('sub-programs')
    async getSubPrograms() {
        return await this.salesforceService.getSubPrograms();
    }

    @Post('campaigns')
    async createCampaign(@Body() body: any) {
        return await this.salesforceService.createCampaign(body);
    }

    @Get('campaigns/:campaignId')
    async getCampaignDetails(@Param('campaignId') campaignId: string) {
        return await this.salesforceService.getCampaignDetails(campaignId);
    }
}
