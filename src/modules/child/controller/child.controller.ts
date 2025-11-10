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

    @Post('/createSponsorship')
    create() {
        return "Create child endpoint";
    }
    @Post('/reserve')
    update(@Body() childToreserve: ChildToreserve[]) {       
        return this.childService.reserveChildren(childToreserve);
    }
    // Use POST because we expect a request body with requested counts
    @Post('/available')
    async getChildrenByNationality(@Body() childToreserve: ChildToreserve[]) {
        return this.childService.getAvailableChildrenByNationality(childToreserve);
    }
}
