import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './controller/orders.controller';
import { OrdersService } from './service/orders.service';
import { Orders, OrdersSchema } from './entities/orders.entity';
@Module({
    imports: [
            OrdersModule,
            MongooseModule.forFeature([{ name: Orders.name, schema: OrdersSchema }]),
        ],
        controllers: [OrdersController],
        providers: [OrdersService],
        exports: [OrdersService],
})
export class OrdersModule {}
