import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SponsorshipCreatedEvent } from '../events/sponsprship-created.events';
import { DonationService } from 'src/modules/donation/service/donation.service';
import { Donation } from 'src/modules/donation/entities/donation.entity';
import mongoose, { Model, Types as MongooseTypes } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { RecurringService } from 'src/modules/recurring/service/recurring.service';
import { Recurring } from 'src/modules/recurring/entities/recurring.entity';
import { RecurringCreatedEvent } from '../events/recurring-create.events';
import { SponsorshipService } from '../service/sponsorship.service';

@Injectable()
export class SponsorshipCreatedListener {
    constructor(
        @Inject() private readonly recurringService: RecurringService,
        @Inject() private readonly sponsorshipService: SponsorshipService,
        @Inject() private readonly donationService: DonationService,
        @InjectModel(Donation.name) private readonly DonationModel: Model<Donation>,
    ) { }
    @OnEvent('sponsorship.updated')
    async handleSponsorshipCreatedEvent(event: SponsorshipCreatedEvent) {
        console.log(event);
        const sponsorship = await this.sponsorshipService.findById(event.id);
        const sponsorshipDevidedChild: any[] = [];
        //const recurringCreated = await this.recurringService.createRecurring(recurring);
        if (sponsorship) {
            /*  const recurring = {
                 name: `Recurring for Sponsorship ${event.sponsorshipID}`,
                 donorType: 'Contact',
                 frequency: donation.frequency ? donation.frequency : 'Monthly',
                 amount: donation.Amount,
                 dateEstablished: new Date().toISOString(),
                 effectiveDate: new Date().toISOString(),
                 DayOfMonth: new Date().getDate(),
                 donations: donation._id ? (new mongoose.Types.ObjectId(donation._id as string) as unknown as any) : '',
                 sponsorships: event.id ? (new mongoose.Types.ObjectId(event.id) as unknown as any) : '',
                 donor: sponsorship.donor
             };
             const recurringCreated = await this.recurringService.createRecurring(recurring); */
            for (const child of sponsorship.child) {
                const timestamp = new Date().getTime();
                const random = Math.floor(Math.random() * 1000);
                sponsorshipDevidedChild.push({
                    sponsorshipID: `SP${timestamp}${random}`,
                    child: child,
                    donor: sponsorship.donor,
                    donation: sponsorship.donation,
                    Status: sponsorship.Status,
                    Donor__c: sponsorship.Donor__c,
                    Start_Date__c: sponsorship.Start_Date__c,
                    Recurring: sponsorship.Recurring,
                })
            }

            const createDevided = await this.sponsorshipService.createMany(sponsorshipDevidedChild);
            /* donation.Recurring = recurringCreated._id ? (new mongoose.Types.ObjectId(recurringCreated._id as string) as unknown as any) : '';
            donation.save(); */
            console.log('createDevided: ', createDevided);
            //console.log('donation ' + donation);
        }
        //console.log(event.Status);

        // handle and process "OrderCreatedEvent" event
        /* const donation = await this.DonationModel.findById(event.donation);
        console.log('donation ' + donation);

        const child = event.child ? event.child[0] : null;
        if (donation) {
            const recurring = {
                name: `Recurring for Sponsorship ${event.sponsorshipID}`,
                donorType: 'Contact',
                frequency: donation.frequency ? donation.frequency : 'Monthly',
                amount: donation.Amount,
                dateEstablished: new Date().toISOString(),
                effectiveDate: new Date().toISOString(),
                DayOfMonth: new Date().getDate(),
                donations: donation._id ? (new mongoose.Types.ObjectId(donation._id as string) as unknown as any) : '',
                sponsorships: event.id ? (new mongoose.Types.ObjectId(event.id) as unknown as any) : '',
                child: child || undefined
            };
            await this.recurringService.createRecurring(recurring);
            console.log('recurring:', recurring);
            //console.log('donation ' + donation);

        } */
    }
}