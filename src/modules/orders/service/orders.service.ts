import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Orders } from '../entities/orders.entity';
import { Model, Types as MongooseTypes, set } from 'mongoose';
import { CreateOrderDto } from '../dto/orders.dto';

@Injectable()
export class OrdersService {
    constructor(
        @InjectModel(Orders.name) private readonly OrdersModel: Model<Orders>,
    ) {}

    async createOrder(orderData: CreateOrderDto){
        const order = new this.OrdersModel(orderData);
        const response = await order.save();
        return response;
    }
}
