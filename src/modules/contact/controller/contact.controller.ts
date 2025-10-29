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
    @Get('/findAll/:q')
    findAll(@Param('q') q: string) {
        console.log('Controller received query param:', q);
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
}
