import { Controller, Get, Post } from '@nestjs/common';
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
}
