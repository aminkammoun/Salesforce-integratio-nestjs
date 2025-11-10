import { Module } from '@nestjs/common';
import { Recurring, RecurringSchema } from './entities/recurring.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { RecurringController } from './controller/recurring.controller';
import { RecurringService } from './service/recurring.service';

@Module({
    imports: [
            MongooseModule.forFeature([{ name: Recurring.name, schema: RecurringSchema }]),
        ],
    controllers: [RecurringController],
    providers: [RecurringService],
    // Export the MongooseModule so other modules can inject the Recurring model
    exports: [MongooseModule,RecurringService],
})
export class RecurringModule {}
