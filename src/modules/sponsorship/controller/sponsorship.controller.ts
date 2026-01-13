import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SponsorshipService } from '../service/sponsorship.service';
import { CreateSponsorshipDto } from '../dto/create-sponsorship';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('sponsorship')
export class SponsorshipController {
    constructor(private readonly sponsorshipService: SponsorshipService) { }
    @Post('/create')
    create(@Body() createSponsorshipDto: CreateSponsorshipDto) {
        return this.sponsorshipService.create(createSponsorshipDto);
    }
    @Get('/')
    findAll() {
        return this.sponsorshipService.findAll();
    }
    @Get('/:id')
    findOne(@Body('id') id: string[]) {
        return this.sponsorshipService.findByIds(id);
    }
    @Post('/updateToActive/:sponsorshipId')
    updateToActive(@Param('sponsorshipId') sponsorshipId: string) {
        return this.sponsorshipService.updateToActive(sponsorshipId);
    }
    @Post('/delete/:id')
    delete(@Param('id') id: string) {
        return this.sponsorshipService.delete(id);
    }
    @Post('/uploadSalesforce')
    async uploadToSalesforce() {
        const sponsorships = await this.sponsorshipService.uploadSponsorshipsToSalesforce();
        return sponsorships;
    }
    @Post('/expired')
    async markExpired(@Body('childIds') childIds: string[]) {
        console.log('Marking children as expired:', childIds);
        return this.sponsorshipService.updateToExpired(childIds);
    }
    @Post('/checkChild')
    async syncChildrenWithSponsorships() {
        return this.sponsorshipService.checkIfChildIsSponsored();
    }
    @UseGuards(JwtAuthGuard)
    @Get('/getsf/:cnid')
    getSalesforcesp(@Param('cnid') cnid: string) {
        return this.sponsorshipService.findSpFromSalesforceByWordpressId(cnid);
    }
    @Post('/rp')
    async repaireSp() {
        return this.sponsorshipService.repaireSp();
    }
    @Post('/deleteChild')
    async deleteChild() {
        return this.sponsorshipService.deleteChildFromSponsorships();
    }
    @Post('/updateBycontactSfId')
    async updateBycontactSfId() {
        return await this.sponsorshipService.updateSpBycontactSfId();
    }
}