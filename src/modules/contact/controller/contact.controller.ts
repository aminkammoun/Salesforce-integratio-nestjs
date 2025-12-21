import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ContactService } from '../service/contact.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('contact')
export class ContactController {
    constructor(private readonly contactService: ContactService) { }

    @Post('/create')
    @ApiOperation({ summary: 'Create one contact', description: 'Creates a new contact record in the database.' })
    @ApiResponse({ status: 201, description: 'contact created successfully' })

    create(@Body() createContactleDto: CreateContactDto) {
        return this.contactService.create(createContactleDto);
    }
    @Get('/phone/:phone')
    @ApiOperation({ summary: 'Find contact by phone', description: 'Finds a contact by their phone number.' })
    @ApiResponse({ status: 200, description: 'Contact found successfully' })
    findByPhone(@Param('phone') phone: string) {
        return this.contactService.findByPhone(phone);
    }
    @Get('/:id')
    @ApiOperation({ summary: 'Find contact by id', description: 'Finds a contact by their id number.' })
    @ApiResponse({ status: 200, description: 'Contact found successfully' })
    findOne(@Param('id') id: string) {
        return this.contactService.findOne(id);
    }
    @Get('/email/:email')
    @ApiOperation({ summary: 'Find contact by email', description: 'Finds a contact by their email address.' })
    @ApiResponse({ status: 200, description: 'Contact found successfully' })
    findByEmail(@Param('email') email: string) {
        return this.contactService.findByEmail(email);
    }
    @Get('/findAll/:q')

    findAll(@Param('q') q: string) {
        return this.contactService.insertFromSalesforce(q);
    }
    @Patch('/:id')
    @ApiOperation({ summary: 'Update a contact', description: 'Updates an existing contact record in the database.' })
    @ApiResponse({ status: 200, description: 'Contact updated successfully' })
    update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
        return this.contactService.update(id, updateContactDto);
    }
    @Delete('/:id')
    delete(@Param('id') id: string) {
        return this.contactService.delete(id);
    }
    @Post('/uploadSalesforce')
    async uploadToSalesforce() {
        const contacts = await this.contactService.updloadContactsToSalesforce();
        return contacts;
    }
    @Get('/emptyEmail')
    @ApiOperation({ summary: 'Find contacts with empty email', description: 'Finds all contacts that have an empty email field.' })
    @ApiResponse({ status: 200, description: 'Contacts found successfully' })
    async findContactsWithEmptyEmail() {
        return this.contactService.getContactWithEmptyEmail();
    }
    @Post('/assignEmail/')
    @ApiOperation({ summary: 'Assign email to a contact', description: 'Assigns an email address to a contact based on their phone number.' })
    @ApiResponse({ status: 200, description: 'Email assigned successfully' })
    async assignEmailToContacts(@Body() body: { phone: string; email: string }) {
        const { phone, email } = body;
        return this.contactService.assignEmailToContact(phone, email);
    }
    @Get('/wordpressid/:wordpressID')
    @ApiOperation({ summary: 'Find contact by WordPress ID', description: 'Finds a contact by their WordPress ID.' })
    @ApiResponse({ status: 200, description: 'Contact found successfully' })
    findByWordPressID(@Param('wordpressID') wordpressID: string) {
        return this.contactService.findByWordPressID(wordpressID);
    }
}
