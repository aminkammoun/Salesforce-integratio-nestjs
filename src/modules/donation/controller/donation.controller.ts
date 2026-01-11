import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DonationService } from '../service/donation.service';
import CreateDonationDto from '../dto/create-donation.dto';
import { UpdateDonationDto } from '../dto/update-donation.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@ApiTags('Donation')
@Controller('donation')
export class DonationController {
    constructor(private readonly donationService: DonationService) { }

    @Post('/create')
    @ApiOperation({ summary: 'Create one or more donations', description: 'Creates new donation records with full details including cart items, transaction details, and recurring information.' })
    @ApiBody({ type: [CreateDonationDto], description: 'Array of donation objects to create' })
    @ApiResponse({ status: 201, description: 'Donations created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid donation data' })
    create(@Body() createDonationDto: CreateDonationDto[]) {
        console.log('CreateDonationDto received in controller:', createDonationDto);
        return this.donationService.create(createDonationDto);
    }
    @Get('/findAll')
    @ApiOperation({ summary: 'Get all donations', description: 'Retrieves all donation records from the database' })
    @ApiResponse({ status: 200, description: 'List of all donations' })
    findAll() {
        console.log('findAll endpoint hit at:', new Date().toISOString());
        return this.donationService.findAll();
    }

    @Post('update/:id')
    @ApiOperation({ summary: 'Update a donation', description: 'Updates an existing donation record by ID' })
    @ApiResponse({ status: 200, description: 'Donation updated successfully' })
    @ApiResponse({ status: 404, description: 'Donation not found' })
    update(@Param('id') id: string, @Body() updateDonationDto: UpdateDonationDto) {
        return this.donationService.update(id, updateDonationDto);
    }

    @Get('/findBySalesforceID/:contact')
    @ApiOperation({ summary: 'Find donations by Salesforce contact ID', description: 'Retrieves donations associated with a specific Salesforce contact' })
    @ApiResponse({ status: 200, description: 'Donations found' })
    findBySalesforceID(@Param('contact') contact: string) {
        console.log('Controle contact:', contact);
        return this.donationService.findDonationBySalesforceID(contact);
    }

    @Get('/:id')
    @ApiOperation({ summary: 'Get a donation by ID', description: 'Retrieves a single donation by its database ID' })
    @ApiResponse({ status: 200, description: 'Donation found' })
    @ApiResponse({ status: 404, description: 'Donation not found' })
    findOne(@Param('id') id: string) {
        console.log('Get donation by ID called with ID:', id);
        return this.donationService.findOneId(id);
    }

    @Post('/insertToSalesforce')
    @ApiOperation({ summary: 'Upload donations to Salesforce', description: 'Syncs all unsynced donations to Salesforce CRM' })
    @ApiResponse({ status: 200, description: 'Donations uploaded to Salesforce' })
    insert() {
        // Pass the actual DTO instance to the service (not a string literal)
        return this.donationService.uploadDonationsToSalesforce();
    }

    @Post('/delete')
    @ApiOperation({ summary: 'Delete donations', description: 'Deletes one or more donations by their IDs' })
    @ApiBody({ type: [String], description: 'Array of donation IDs to delete' })
    @ApiResponse({ status: 200, description: 'Donations deleted successfully' })
    async deleteDonation(@Body() id: string[]) {
        return this.donationService.delete(id)
    }
    @UseGuards(JwtAuthGuard)
    @Get('/getsf/:cnid')
    getSalesforceDonations(@Param('cnid') cnid: string) {
        return this.donationService.findDonationsFromSalesforceByWorksheetId(cnid);
    }
    @Post('/repaireDon')
    async repaireDonations() {
        return this.donationService.repaireDonations();
    }
}
