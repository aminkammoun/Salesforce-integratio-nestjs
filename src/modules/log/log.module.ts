import { Module } from '@nestjs/common';
import { LogService } from './service/log.service';
import { MongooseModule } from '@nestjs/mongoose';
import { LogController } from './controller/log.controller';
import { Log, LogSchema } from './entities/log.entity';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Log.name, schema: LogSchema }]),
    ],
    controllers: [LogController],
    providers: [LogService],
    exports: [MongooseModule, LogService],
})
export class LogModule { }
