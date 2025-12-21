import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { errors, ErrorsSchema } from './entities/errors.entities';
import { ErrorsController } from './controller/errors.controller';
import { ErrorsService } from './service/errors.service';

@Module({
    imports: [
        ErrorsModule,
        MongooseModule.forFeature([{ name: errors.name, schema: ErrorsSchema }]),
    ],
    controllers: [ErrorsController],
    providers: [ErrorsService],
    exports: [ErrorsService],

})
export class ErrorsModule { }
