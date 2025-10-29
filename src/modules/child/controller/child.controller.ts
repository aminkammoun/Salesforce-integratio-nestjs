import { Controller, Get, Param, Post } from '@nestjs/common';
import { ChildService } from '../service/child.service';

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

    @Get('/by-nationality')
    async getChildrenByNationality() {
        return this.childService.getChildrenByNationality();
    }
}
