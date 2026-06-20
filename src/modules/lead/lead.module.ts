import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadController } from './controllers/lead.controller';
import { LeadService } from './services/lead.service';
import { Lead, LeadSchema } from './entities/lead.entity';
@Module({
    imports: [
        LeadModule,
        MongooseModule.forFeature([{ name: Lead.name, schema: LeadSchema }]),
    ],
    controllers: [LeadController],
    providers: [LeadService],
})
export class LeadModule {

}



