import { Body, Controller, Post } from '@nestjs/common';
import { OrdersService } from '../service/orders.service';
@Controller('orders')
export class OrdersController {
    constructor(private readonly OrdersService: OrdersService) {}
    @Post("/create")
    async createOrder(@Body() body: any) {
        // Logic to create an order
        return this.OrdersService.createOrder(body);
        
    }
}
