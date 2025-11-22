import { Body, Controller, Post } from '@nestjs/common';
import { RecurringService } from '../service/recurring.service';
import { CreateRecurringDto } from '../dto/create-recurring.dto';

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
}
