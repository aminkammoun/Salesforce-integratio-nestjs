import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RecurringService } from '../service/recurring.service';
import { CreateRecurringDto } from '../dto/create-recurring.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('recurring')
export class RecurringController {
    constructor(private readonly recurringService: RecurringService) { }

    @Post('/create')
    createRecurring(@Body() body: CreateRecurringDto) {
        this.recurringService.createRecurring(body);
        // Logic to create a recurring payment
        return this.recurringService.createRecurring(body);;
    }
    @Post('/insertToSalesforce')
    insert() {
        // Pass the actual DTO instance to the service (not a string literal)
        return this.recurringService.uploadRecurringsToSalesforce();
    }
    @UseGuards(JwtAuthGuard)
    @Get('/getsf/:cnid')
    getSalesforceRecurring(@Param('cnid') cnid: string) {
        return this.recurringService.findRecurringFromSalesforceByWordpressId(cnid);
    }
}
