import { Module } from '@nestjs/common';
import { ChildService } from './service/child.service';
import { ChildController } from './controller/child.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Child, ChildSchema } from './entities/child.entity';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Child.name, schema: ChildSchema }]),
      ],
    controllers: [ChildController],
    providers: [ChildService],
})
export class ChildModule { }
