import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChildService } from '../service/child.service';
import type { ChildToreserve } from 'src/config/types';



@Controller('child')
export class ChildController {
    constructor(private readonly childService: ChildService) { }
    @Get('/findAll/:q')
    findAll(@Param('q') q: string) {
        console.log('Controller received query param:', q);
        return this.childService.findAll(q);
    }

    @Post('/create')
    create() {
        return "Create child endpoint";
    }

    // Use POST because we expect a request body with requested counts
    @Post('/by-nationality')
    async getChildrenByNationality(@Body() childToreserve: ChildToreserve[]) {
        return this.childService.getChildrenByNationality(childToreserve);
    }
}
