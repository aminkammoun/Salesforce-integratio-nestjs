import { forwardRef, Module } from '@nestjs/common';
import { ChildService } from './service/child.service';
import { ChildController } from './controller/child.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Child, ChildSchema } from './entities/child.entity';
import { SponsorshipModule } from '../sponsorship/sponsorship.module';
import { ChildCronService } from './service/child-cron.service';
import { LogModule } from '../log/log.module';

@Module({
  imports: [
    LogModule,

    forwardRef(() => SponsorshipModule),
    MongooseModule.forFeature([{ name: Child.name, schema: ChildSchema }]),
  ],
  controllers: [ChildController],
  providers: [ChildService, ChildCronService],
  exports: [MongooseModule, ChildService],
})
export class ChildModule { }
