import { Body, Controller, Get, Param, Post, Request, Res } from '@nestjs/common';
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
}
