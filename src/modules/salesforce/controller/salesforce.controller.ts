import { Controller, Get, Post, Request, Res } from '@nestjs/common';
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
}
