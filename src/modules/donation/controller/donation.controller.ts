import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { DonationService } from '../service/donation.service';
import CreateDonationDto from '../dto/create-donation.dto';
import { UpdateDonationDto } from '../dto/update-donation.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
@Controller('donation')
export class DonationController {
    constructor(private readonly donationService: DonationService) { }
    @Post('/create')
    create(@Body() createDonationDto: CreateDonationDto) {
        console.log('CreateDonationDto received in controller:', createDonationDto);
        return this.donationService.create(createDonationDto);
    }
    @Get('/findAll')
    findAll() {
        console.log('findAll endpoint hit at:', new Date().toISOString());
        return this.donationService.findAll();
    }
    @Post('update/:id')
    update(@Param('id') id: string, @Body() updateDonationDto: UpdateDonationDto) {
        return this.donationService.update(id, updateDonationDto);
    }

    @Get('/findBySalesforceID/:contact')
    findBySalesforceID(@Param('contact') contact: string) {
        console.log('Controle contact:', contact);
        return this.donationService.findDonationBySalesforceID(contact);
    }

    @Get('/:id')
    findOne(@Param('id') id: string) {
        return this.donationService.findOneId(id);
    }
    @Post('/insertToSalesforce')
    insert(@Body() createDonationDto: any) {
        console.log('Received request to create donation in Salesforce:', createDonationDto);
        // Pass the actual DTO instance to the service (not a string literal)
        return this.donationService.createDonationSalesforce(createDonationDto);
    }
}
