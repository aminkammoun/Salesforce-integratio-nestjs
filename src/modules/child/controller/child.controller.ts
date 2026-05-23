import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ChildService } from '../service/child.service';
import type { childAttachment, ChildToreserve, SponsorshipChilds } from 'src/config/types';
import { UpdateChildDto } from '../dto/update-child.dto';
import { CreateChildDto } from '../dto/create-child.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ApiOperation, ApiResponse, ApiParam, ApiBody, ApiTags } from '@nestjs/swagger';


@ApiTags('Child')
@Controller('child')
export class ChildController {
    constructor(private readonly childService: ChildService) { }

    @Get('/synchsalesforce/:q')
    @ApiOperation({ summary: 'Synchronize children from Salesforce', description: 'Inserts/syncs children data from Salesforce based on query parameter' })
    @ApiParam({ name: 'q', description: 'Query parameter for Salesforce sync', example: 'Available' })
    @ApiResponse({ status: 200, description: 'Children synchronized successfully' })
    findAll(@Param('q') q: string) {
        console.log('Controller received query param:', q);
        return this.childService.findAll(q);
    }

    @Post('/create')
    @ApiOperation({ summary: 'Create children', description: 'Creates new child records in the database' })
    @ApiBody({ type: [CreateChildDto], description: 'Array of child objects to create' })
    @ApiResponse({ status: 201, description: 'Children created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    create(@Body() CreateChildDto: CreateChildDto[]) {
        return this.childService.create(CreateChildDto);
    }

    @Post('update/:id')
    @ApiOperation({ summary: 'Update child', description: 'Updates an existing child record' })
    @ApiParam({ name: 'id', description: 'Child ID', example: '123456' })
    @ApiBody({ type: UpdateChildDto })
    @ApiResponse({ status: 200, description: 'Child updated successfully' })
    @ApiResponse({ status: 404, description: 'Child not found' })
    updateChild(@Param('id') id: string, @Body() updateChildDto: UpdateChildDto) {
        return this.childService.updateChild(id, updateChildDto);
    }

    @Post('/reserve')
    @ApiOperation({ summary: 'Reserve children', description: 'Reserves children for sponsorship' })
    @ApiBody({ type: [Object], description: 'Array of sponsorship children objects to reserve' })
    @ApiResponse({ status: 200, description: 'Children reserved successfully' })
    reserve(@Body() childToreserve: SponsorshipChilds[]) {
        //console.log('childToreserve:', childToreserve.childToreserve, childToreserve.donorId);
        return this.childService.reserveChildren(childToreserve);
        //return this.childService.reserveChildren(childToreserve.childToreserve, childToreserve.donorId, childToreserve.donationId,childToreserve.frequency,childToreserve.Amount);
    }

    // Use POST because we expect a request body with requested counts
    @Post('/available')
    @ApiOperation({ summary: 'Get available children by nationality', description: 'Retrieves available children filtered by nationality' })
    @ApiBody({ type: [Object], description: 'Array of nationality filters' })
    @ApiResponse({ status: 200, description: 'Available children retrieved successfully' })
    async getChildrenByNationality(@Body() childToreserve: ChildToreserve[]) {
        return this.childService.getAvailableChildrenByNationality(childToreserve);
    }

    @Get('/salesforceIDs')
    @ApiOperation({ summary: 'Get children by Salesforce IDs', description: 'Retrieves children by their Salesforce IDs' })
    @ApiBody({ type: [String], description: 'Array of Salesforce IDs' })
    @ApiResponse({ status: 200, description: 'Children retrieved successfully' })
    async getBySalesforceIDs(@Body() ids: string[]) {
        return this.childService.findBySalesforceIDs(ids);
    }

    @Post('/whereMostNeeded')
    @ApiOperation({ summary: 'Get most needed nationalities', description: 'Retrieves nationalities with the most children needing sponsorship' })
    @ApiResponse({ status: 200, description: 'Most needed nationalities retrieved successfully' })
    async getMostNeededNationalities() {
        return this.childService.getMostNededNationalities();
    }

    @Post('/markasAvailable')
    @ApiOperation({ summary: 'Mark children as available', description: 'Marks children as available for sponsorship' })
    @ApiResponse({ status: 200, description: 'Children marked as available successfully' })
    async markAsAvailable(@Body() ids: string[]) {
        return this.childService.markAsAvailable(ids);
    }

    @Post('/uploadAttachments')
    @ApiOperation({ summary: 'Upload attachments to Salesforce', description: 'Uploads child attachments to Salesforce' })
    @ApiBody({ type: Object, description: 'Child attachment object' })
    @ApiResponse({ status: 200, description: 'Attachments uploaded successfully' })
    async uploadAttachmentsToSalesforce(@Body() body: childAttachment) {
        return this.childService.uploadChildAttachmentsToSalesforce(body);
    }

    @Get('/attachments/:childId')
    @ApiOperation({ summary: 'Get attachments from Salesforce', description: 'Retrieves child attachments from Salesforce' })
    @ApiParam({ name: 'childId', description: 'Salesforce child ID', example: '0013Y00000XYZ' })
    @ApiResponse({ status: 200, description: 'Attachments retrieved successfully' })
    async getAttachmentsFromSalesforce(@Param('childId') childId: string) {
        return this.childService.retrieveAttachmentsFromSalesforce(childId);
    }

    @Post('/updateToSponsored')
    @ApiOperation({ summary: 'Update child to sponsored status', description: 'Updates a child record to sponsored status' })
    @ApiBody({ type: Object, description: 'Update payload' })
    @ApiResponse({ status: 200, description: 'Child updated to sponsored successfully' })
    async updateToSponsored(@Body() body: any) {
        return this.childService.updateToSponsored(body);
    }
    @Post('/updateToAvailable')
    @ApiOperation({ summary: 'Update child to available status', description: 'Updates a child record to available status' })
    @ApiBody({ type: Object, description: 'Update payload' })
    @ApiResponse({ status: 200, description: 'Child updated to available successfully' })
    async updateToAvailable(@Body() body: any) {
        return this.childService.updateToAvailable(body);
    }

    @Get('/sponsorStatus/:childId')
    @ApiOperation({ summary: 'Check sponsor status', description: 'Checks the current sponsorship status of a child' })
    @ApiParam({ name: 'childId', description: 'Salesforce child ID', example: '0013Y00000XYZ' })
    @ApiResponse({ status: 200, description: 'Sponsor status retrieved successfully' })
    async getSponsorStatus(@Param('childId') childId: string) {
        return this.childService.checkChildStatus(childId);
    }

    @Get('/sponsorStatus')
    @ApiOperation({ summary: 'Get all children sponsor status', description: 'Retrieves sponsor status for all children' })
    @ApiResponse({ status: 200, description: 'All sponsor statuses retrieved successfully' })
    async getAllSponsorStatus() {
        return this.childService.giveAllChildrenStatus();
    }

    @Get('/sponsorList/:page')
    @ApiOperation({ summary: 'Get paginated sponsor list', description: 'Retrieves a paginated list of children available for sponsorship' })
    @ApiParam({ name: 'page', description: 'Page number', example: 1 })
    @ApiResponse({ status: 200, description: 'Sponsor list retrieved successfully' })
    async getSponsorList(@Param('page') page: number) {
        return this.childService.sponsorList(page);
    }

    @Post('/synchronize/:synched')
    @ApiOperation({ summary: 'Synchronize children sync status', description: 'Updates the synchronization status of children' })
    @ApiParam({ name: 'synched', description: 'Synchronization status (true/false)', example: true })
    @ApiResponse({ status: 200, description: 'Children sync status updated successfully' })
    async synchronizeChildren(@Param('synched') synched: boolean) {
        return this.childService.updateSynchedStatus(synched);
    }

}
