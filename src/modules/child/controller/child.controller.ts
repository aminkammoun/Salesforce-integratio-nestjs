import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ChildService } from '../service/child.service';
import type { childAttachment, ChildToreserve, SponsorshipChilds } from 'src/config/types';
import { UpdateChildDto } from '../dto/update-child.dto';
import { CreateChildDto } from '../dto/create-child.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';



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
    @UseGuards(JwtAuthGuard)
    @Get('/attachments/:childId')
    async getAttachmentsFromSalesforce(@Param('childId') childId: string) {
        return this.childService.retrieveAttachmentsFromSalesforce(childId);
    }
    @UseGuards(JwtAuthGuard)
    @Post('/updateToSponsored')
    async updateToSponsored(@Body() body: any) {
        return this.childService.updateToSponsored(body);
    }
    @UseGuards(JwtAuthGuard)
    @Get('/sponsorStatus/:childId')
    async getSponsorStatus(@Param('childId') childId: string) {
        return this.childService.checkChildStatus(childId);
    }
    @UseGuards(JwtAuthGuard)
    @Get('/sponsorStatus')
    async getAllSponsorStatus() {
        return this.childService.giveAllChildrenStatus();
    }
    @UseGuards(JwtAuthGuard)
    @Get('/sponsorList/:page')
    async getSponsorList(@Param('page') page: number) {
        return this.childService.sponsorList(page);
    }
    @UseGuards(JwtAuthGuard)
    @Post('/synchronize/:synched')
    async synchronizeChildren(@Param('synched') synched: boolean) {
        return this.childService.updateSynchedStatus(synched);
    }

}
