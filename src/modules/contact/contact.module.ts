import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Contact } from './entities/contact.entity';
import { ContactSchema } from './entities/contact.entity';
import { ContactController } from './controller/contact.controller';
import { ContactService } from './service/contact.service';
@Module({
    imports: [
    MongooseModule.forFeature([{ name: Contact.name, schema: ContactSchema }]),
  ],
    controllers: [ContactController],
    providers: [ContactService],
})
export class ContactModule {}
