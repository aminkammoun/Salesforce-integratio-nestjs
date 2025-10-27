import { Module } from '@nestjs/common';
import { ChildService } from './service/child.service';
import { ChildController } from './controller/child.controller';

@Module({
    controllers: [ChildController],
    providers: [ChildService],
})
export class ChildModule { }
