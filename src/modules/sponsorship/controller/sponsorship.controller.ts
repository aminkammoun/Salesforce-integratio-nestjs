import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SponsorshipService } from '../service/sponsorship.service';
import { CreateSponsorshipDto } from '../dto/create-sponsorship';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ApiOperation, ApiResponse, ApiParam, ApiBody, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Sponsorship')
@Controller('sponsorship')
export class SponsorshipController {
    constructor(private readonly sponsorshipService: SponsorshipService) { }

    @Post('/create')
    @ApiOperation({ summary: 'Create sponsorship', description: 'Creates a new sponsorship relationship between a donor and a child' })
    @ApiBody({ type: CreateSponsorshipDto })
    @ApiResponse({ status: 201, description: 'Sponsorship created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid sponsorship data' })
    create(@Body() createSponsorshipDto: CreateSponsorshipDto) {
        return this.sponsorshipService.create(createSponsorshipDto);
    }

    @Get('/')
    @ApiOperation({ summary: 'Get all sponsorships', description: 'Retrieves all sponsorship records from the database' })
    @ApiResponse({ status: 200, description: 'List of all sponsorships' })
    findAll() {
        return this.sponsorshipService.findAll();
    }

    @Get('/:id')
    @ApiOperation({ summary: 'Get sponsorships by IDs', description: 'Retrieves sponsorships by an array of IDs' })
    @ApiParam({ name: 'id', description: 'Array of sponsorship IDs' })
    @ApiResponse({ status: 200, description: 'Sponsorships found' })
    findOne(@Body('id') id: string[]) {
        return this.sponsorshipService.findByIds(id);
    }

    @Post('/updateToActive/:sponsorshipId')
    @ApiOperation({ summary: 'Activate sponsorship', description: 'Updates a sponsorship status to active' })
    @ApiParam({ name: 'sponsorshipId', description: 'Sponsorship ID', example: '123456' })
    @ApiResponse({ status: 200, description: 'Sponsorship activated successfully' })
    @ApiResponse({ status: 404, description: 'Sponsorship not found' })
    updateToActive(@Param('sponsorshipId') sponsorshipId: string) {
        return this.sponsorshipService.updateToActive(sponsorshipId);
    }

    @Post('/delete/:id')
    @ApiOperation({ summary: 'Delete sponsorship', description: 'Deletes a sponsorship record' })
    @ApiParam({ name: 'id', description: 'Sponsorship ID', example: '123456' })
    @ApiResponse({ status: 200, description: 'Sponsorship deleted successfully' })
    @ApiResponse({ status: 404, description: 'Sponsorship not found' })
    delete(@Param('id') id: string) {
        return this.sponsorshipService.delete(id);
    }

    @Post('/uploadSalesforce')
    @ApiOperation({ summary: 'Upload sponsorships to Salesforce', description: 'Syncs all unsynced sponsorships to Salesforce CRM' })
    @ApiResponse({ status: 200, description: 'Sponsorships uploaded successfully' })
    async uploadToSalesforce() {
        const sponsorships = await this.sponsorshipService.uploadSponsorshipsToSalesforce();
        return sponsorships;
    }

    @Post('/expired')
    @ApiOperation({ summary: 'Mark sponsorships as expired', description: 'Marks sponsorships for specific children as expired' })
    @ApiBody({ schema: { properties: { childIds: { type: 'array', items: { type: 'string' }, example: ['child1', 'child2'] } } } })
    @ApiResponse({ status: 200, description: 'Sponsorships marked as expired' })
    async markExpired(@Body('childIds') childIds: string[]) {
        console.log('Marking children as expired:', childIds);
        return this.sponsorshipService.updateToExpired(childIds);
    }

    @Post('/checkChild')
    @ApiOperation({ summary: 'Sync children sponsorship status', description: 'Checks and syncs which children are sponsored' })
    @ApiResponse({ status: 200, description: 'Children sponsorship status synced' })
    async syncChildrenWithSponsorships() {
        return this.sponsorshipService.checkIfChildIsSponsored();
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('/getsf/:cnid')
    @ApiOperation({ summary: 'Get sponsorship from Salesforce', description: 'Retrieves sponsorship data from Salesforce by WordPress ID' })
    @ApiParam({ name: 'cnid', description: 'WordPress contact ID', example: 'wp123456' })
    @ApiResponse({ status: 200, description: 'Sponsorship found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Sponsorship not found' })
    getSalesforcesp(@Param('cnid') cnid: string) {
        return this.sponsorshipService.findSpFromSalesforceByWordpressId(cnid);
    }

    @Post('/deleteChild')
    @ApiOperation({ summary: 'Delete child from sponsorships', description: 'Removes a child from all sponsorship records' })
    @ApiResponse({ status: 200, description: 'Child deleted from sponsorships' })
    async deleteChild() {
        return this.sponsorshipService.deleteChildFromSponsorships();
    }

    @Post('/updateBycontactSfId')
    @ApiOperation({ summary: 'Update sponsorships by Salesforce contact ID', description: 'Updates sponsorship records based on Salesforce contact ID' })
    @ApiResponse({ status: 200, description: 'Sponsorships updated' })
    async updateBycontactSfId() {
        return await this.sponsorshipService.updateSpBycontactSfId();
    }
}