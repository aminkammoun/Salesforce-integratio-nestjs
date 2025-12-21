import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ContactService } from '../service/contact.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';

@Controller('contact')
export class ContactController {
    constructor(private readonly contactService: ContactService) { }
    @Post('/create')
    create(@Body() createContactleDto: CreateContactDto) {
        return this.contactService.create(createContactleDto);
    }
    @Get('/phone/:phone')
    findByPhone(@Param('phone') phone: string) {
        return this.contactService.findByPhone(phone);
    }
    @Get('/:id')
    findOne(@Param('id') id: string) {
        return this.contactService.findOne(id);
    }
    @Get('/email/:email')
    findByEmail(@Param('email') email: string) {
        return this.contactService.findByEmail(email);
    }
    @Get('/findAll/:q')
    findAll(@Param('q') q: string) {
        return this.contactService.insertFromSalesforce(q);
    }
    @Patch('/:id')
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
    async findContactsWithEmptyEmail() {
        return this.contactService.getContactWithEmptyEmail();
    }
    @Post('/assignEmail/')
    async assignEmailToContacts(@Body() body: { phone: string; email: string }) {
        const { phone, email } = body;
        return this.contactService.assignEmailToContact(phone, email);
    }
}
