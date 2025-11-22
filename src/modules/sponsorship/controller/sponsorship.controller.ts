import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SponsorshipService } from '../service/sponsorship.service';
import { CreateSponsorshipDto } from '../dto/create-sponsorship';

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
}
