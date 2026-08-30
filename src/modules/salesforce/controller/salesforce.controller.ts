import { Body, Controller, Get, Param, Post, Request, Res, Query, NotFoundException } from '@nestjs/common';
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
        return await this.salesforceService.collectPaymentMethod(req.readerId, req.paymentIntentId);
    }
    @Post('/createPrice')
    async createPrice(@Body() body: any, @Res() res: any) {
        return await this.salesforceService.createStripePrice(body, res);
    }
    @Post('/createCustomer')
    async createCustomer(@Body() body: any, @Res() res: any) {
        return await this.salesforceService.createStripeCustomer(body);
    }
    @Post('/createSubscription')
    async createSubscription(@Body() body: any, @Res() res: any) {
        return await this.salesforceService.createStripeSubscription(body, res);
    }
    @Post('/linkPayment')
    async linkPaymentMethodToCustomer(@Body() body: any) {
        return await this.salesforceService.linkPaymentMethodToCustomer(body.paymentMethodId, body.customerId);
    }
    @Post('/createSubOnStripe/:id')
    async createSubOnStripe(@Param() id: any) {
        return await this.salesforceService.createRecurringOnStripe(id);
    }
    @Post('/createOneSubOnStripe/:id')
    async createOneSubOnStripe(@Param() id: any) {
        return await this.salesforceService.createOneRecurringOnStripe(id);
    }
    /*@Post('/updateBycontactSfId')
    async updateBycontactSfId() {
        return await this.salesforceService.updateRecurringsWithContactSalesforceID();
    }*/
    @Post('/checkStripeSubscription/:id')
    async checkStripeSubscription(@Param('id') id: string) {
        console.log('con', id);
        return await this.salesforceService.checkRecurringIsCreatedOnstripe(id);
    }
    
    // 1. GET /p2p/sub-programs
    @Get('sub-programs')
    async getSubPrograms() {
        return await this.salesforceService.getSubPrograms();
    }

    // 2. GET /p2p/users/:userId/campaigns?page=1&per_page=10
    @Get('users/:userId/campaigns')
    async getUserCampaigns(
        @Param('userId') userId: string,
        @Query('page') page?: string,
        @Query('per_page') perPage?: string,
    ) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const perPageNum = perPage ? parseInt(perPage, 10) : 10;

        return await this.salesforceService.getUserCampaigns(userId, pageNum, perPageNum);
    }

    // 3. GET /p2p/campaigns/:campaignId
    @Get('campaigns/:campaignId')
    async getCampaignDetails(@Param('campaignId') campaignId: string) {
        const res = await this.salesforceService.getCampaignDetails(campaignId);
        if (!res) {
        throw new NotFoundException({
            success: false,
            message: 'Campaign not found.',
        });
        }
        return res;
    }

    // 4. POST /p2p/campaigns
    @Post('campaigns')
    async createCampaign(@Body() dto: any) {
        return await this.salesforceService.createCampaign(dto);
    }
}
