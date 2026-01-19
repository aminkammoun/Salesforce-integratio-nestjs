import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChildService } from '../service/child.service';
import type { childAttachment, ChildToreserve, SponsorshipChilds } from 'src/config/types';
import { UpdateChildDto } from '../dto/update-child.dto';
import { CreateChildDto } from '../dto/create-child.dto';



@Controller('child')
export class ChildController {
    constructor(private readonly childService: ChildService) { }
    @Get('/synchsalesforce/:q')
    findAll(@Param('q') q: string) {
        console.log('Controller received query param:', q);
        return this.childService.insertFromSalesforce(q);
    }

    @Post('/create')
    create(@Body() CreateChildDto: CreateChildDto[]) {
        return this.childService.create(CreateChildDto);
    }
    @Post('update/:id')
    updateChild(@Param('id') id: string, @Body() updateChildDto: UpdateChildDto) {
        return this.childService.updateChild(id, updateChildDto);
    }
    @Post('/reserve')
    reserve(@Body() childToreserve: SponsorshipChilds[]) {
        //console.log('childToreserve:', childToreserve.childToreserve, childToreserve.donorId);
        return this.childService.reserveChildren(childToreserve);
        //return this.childService.reserveChildren(childToreserve.childToreserve, childToreserve.donorId, childToreserve.donationId,childToreserve.frequency,childToreserve.Amount);
    }
    // Use POST because we expect a request body with requested counts
    @Post('/available')
    async getChildrenByNationality(@Body() childToreserve: ChildToreserve[]) {
        return this.childService.getAvailableChildrenByNationality(childToreserve);
    }
    @Get('/salesforceIDs')
    async getBySalesforceIDs(@Body() ids: string[]) {

        return this.childService.findBySalesforceIDs(ids);
    }
    @Post('/whereMostNeeded')
    async getMostNeededNationalities() {
        return this.childService.getMostNededNationalities();
    }
    @Post('/markasAvailable')
    async markAsAvailable() {
        return this.childService.markAsAvailable();
    }
    @Post('/uploadAttachments')
    async uploadAttachmentsToSalesforce(@Body() body: childAttachment) {
        return this.childService.uploadChildAttachmentsToSalesforce(body);
    }
}
