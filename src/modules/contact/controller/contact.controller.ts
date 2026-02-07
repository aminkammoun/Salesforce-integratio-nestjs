import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ContactService } from '../service/contact.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { ApiOperation, ApiResponse, ApiParam, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
    constructor(private readonly contactService: ContactService) { }
    
    @Post('/create')
    @ApiOperation({ summary: 'Create one contact', description: 'Creates a new contact record in the database.' })
    @ApiBody({ type: CreateContactDto })
    @ApiResponse({ status: 201, description: 'contact created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    create(@Body() createContactleDto: CreateContactDto) {
        return this.contactService.create(createContactleDto);
    }

    @Get('/phone/:phone')
    @ApiOperation({ summary: 'Find contact by phone', description: 'Finds a contact by their phone number.' })
    @ApiParam({ name: 'phone', description: 'Phone number', example: '+1234567890' })
    @ApiResponse({ status: 200, description: 'Contact found successfully' })
    @ApiResponse({ status: 404, description: 'Contact not found' })
    findByPhone(@Param('phone') phone: string) {
        return this.contactService.findByPhone(phone);
    }

    @Get('/email/:email')
    @ApiOperation({ summary: 'Find contact by email', description: 'Finds a contact by their email address.' })
    @ApiParam({ name: 'email', description: 'Email address', example: 'contact@example.com' })
    @ApiResponse({ status: 200, description: 'Contact found successfully' })
    @ApiResponse({ status: 404, description: 'Contact not found' })
    findByEmail(@Param('email') email: string) {
        return this.contactService.findByEmail(email);
    }

    @Get('/findAll/:q')
    @ApiOperation({ summary: 'Sync all contacts from Salesforce', description: 'Inserts/syncs all contacts from Salesforce' })
    @ApiParam({ name: 'q', description: 'Query parameter', example: 'all' })
    @ApiResponse({ status: 200, description: 'Contacts synchronized successfully' })
    findAll(@Param('q') q: string) {
        return this.contactService.insertFromSalesforce(q);
    }

    @Patch('/:id')
    @ApiOperation({ summary: 'Update a contact', description: 'Updates an existing contact record in the database.' })
    @ApiParam({ name: 'id', description: 'Contact ID', example: '123456' })
    @ApiBody({ type: UpdateContactDto })
    @ApiResponse({ status: 200, description: 'Contact updated successfully' })
    @ApiResponse({ status: 404, description: 'Contact not found' })
    update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
        return this.contactService.update(id, updateContactDto);
    }

    @Delete('/:id')
    @ApiOperation({ summary: 'Delete a contact', description: 'Deletes a contact record from the database.' })
    @ApiParam({ name: 'id', description: 'Contact ID', example: '123456' })
    @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
    @ApiResponse({ status: 404, description: 'Contact not found' })
    delete(@Param('id') id: string) {
        return this.contactService.delete(id);
    }

    @Post('/uploadSalesforce')
    @ApiOperation({ summary: 'Upload contacts to Salesforce', description: 'Uploads/syncs all contacts to Salesforce' })
    @ApiResponse({ status: 200, description: 'Contacts uploaded successfully' })
    async uploadToSalesforce() {
        const contacts = await this.contactService.updloadContactsToSalesforce();
        return contacts;
    }

    @Get('/text/emptyEmail')
    @ApiOperation({ summary: 'Find contacts with empty email', description: 'Finds all contacts that have an empty email field.' })
    @ApiResponse({ status: 200, description: 'Contacts found successfully' })
    async findContactsWithEmptyEmail() {
        console.log('Finding contacts with empty email');
        return this.contactService.getContactWithEmptyEmail();
    }

    @Post('/text/assignEmail/')
    @ApiOperation({ summary: 'Assign email to a contact', description: 'Assigns an email address to a contact based on their phone number.' })
    @ApiBody({ schema: { properties: { phone: { type: 'string', example: '+1234567890' }, email: { type: 'string', example: 'user@example.com' } } } })
    @ApiResponse({ status: 200, description: 'Email assigned successfully' })
    async assignEmailToContacts(@Body() body: { phone: string; email: string }) {
        const { phone, email } = body;
        return this.contactService.assignEmailToContact(phone, email);
    }

    @Get('/wordpressid/:wordpressID')
    @ApiOperation({ summary: 'Find contact by WordPress ID', description: 'Finds a contact by their WordPress ID.' })
    @ApiParam({ name: 'wordpressID', description: 'WordPress ID', example: 'wp123456' })
    @ApiResponse({ status: 200, description: 'Contact found successfully' })
    @ApiResponse({ status: 404, description: 'Contact not found' })
    findByWordPressID(@Param('wordpressID') wordpressID: string) {
        return this.contactService.findByWordPressID(wordpressID);
    }

    @Get('/find/:id')
    @ApiOperation({ summary: 'Find contact by id', description: 'Finds a contact by their id number.' })
    @ApiParam({ name: 'id', description: 'Contact ID', example: '123456' })
    @ApiResponse({ status: 200, description: 'Contact found successfully' })
    @ApiResponse({ status: 404, description: 'Contact not found' })
    findOne(@Param('id') id: string) {
        return this.contactService.findOne(id);
    }

    @Post('/clean')
    @ApiOperation({ summary: 'Clean contact phone numbers', description: 'Cleans and formats all contact phone numbers' })
    @ApiResponse({ status: 200, description: 'Phone numbers cleaned successfully' })
    async cleanContacts() {
        return this.contactService.cleanContactPhoneNumbers();
    }

    @UseGuards(JwtAuthGuard)
    @Get('/getsf/:cnid')
    @ApiOperation({ summary: 'Get contact from Salesforce by ID', description: 'Retrieves a contact from Salesforce by Salesforce ID' })
    @ApiParam({ name: 'cnid', description: 'Salesforce Contact ID', example: '0013Y00000XYZ' })
    @ApiResponse({ status: 200, description: 'Contact retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    getSalesforcesp(@Param('cnid') cnid: string) {
        return this.contactService.findcontactFromSalesforceBysfId(cnid);
    }

    @Get('/getsfemail/:email')
    @ApiOperation({ summary: 'Get contact from Salesforce by email', description: 'Retrieves a contact from Salesforce by email address' })
    @ApiParam({ name: 'email', description: 'Email address', example: 'contact@example.com' })
    @ApiResponse({ status: 200, description: 'Contact retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Contact not found in Salesforce' })
    getcontactSfByEmail(@Param('email') email: string) {
        console.log('Getting contact from Salesforce by email for email:', email);
        return this.contactService.findcontactFromSalesforceByEmail(email);
    }
}
