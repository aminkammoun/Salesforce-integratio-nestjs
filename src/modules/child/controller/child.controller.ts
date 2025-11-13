import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChildService } from '../service/child.service';
import type { ChildToreserve, SponsorshipChilds } from 'src/config/types';
import { UpdateChildDto } from '../dto/update-child.dto';



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
    @Post('update/:id')
    updateChild(@Param('id') id: string, @Body() updateChildDto: UpdateChildDto) {
        return this.childService.updateChild(id, updateChildDto);
    }
    @Post('/reserve')
    update(@Body() childToreserve: SponsorshipChilds) {
        console.log('childToreserve:', childToreserve.childToreserve, childToreserve.donorId);
        return this.childService.reserveChildren(childToreserve.childToreserve, childToreserve.donorId);
    }
    // Use POST because we expect a request body with requested counts
    @Post('/available')
    async getChildrenByNationality(@Body() childToreserve: ChildToreserve[]) {
        return this.childService.getAvailableChildrenByNationality(childToreserve);
    }
}
