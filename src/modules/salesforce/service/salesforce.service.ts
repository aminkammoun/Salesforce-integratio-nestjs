import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { handleInsertQuery } from 'src/config/utils';
import { Model } from 'mongoose';
import { Contact } from 'src/modules/contact/entities/contact.entity';
import { InjectModel } from '@nestjs/mongoose';
import { ContactService } from 'src/modules/contact/service/contact.service';
import { DonationService } from 'src/modules/donation/service/donation.service';
import { TransactionService } from 'src/modules/transaction/service/transaction.service';
@Injectable()
export class SalesforceService {
    private stripe: Stripe;
    private readonly logger = new Logger(TransactionService.name);

    constructor(


        @Inject() private readonly contactService: ContactService,
        @Inject() private readonly transactionService: TransactionService,
        @Inject() private readonly donationService: DonationService,
        @Inject('STRIPE_API_KEY') private readonly apiKey: string) {
        this.stripe = new Stripe(this.apiKey, {
            apiVersion: "2025-10-29.clover", // Use whatever API latest version
        });
    }
    async getCustomers() {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(
            'pi_3SOmM9PK7Mt7pUeD1gdbX6FR'
        );
        console.log('Payment Intent:', paymentIntent);
        const customers = await this.stripe.customers.list({});
        return customers.data;
    }
    async getAccount() {
        const result = await fetch(process.env.ISTANCEURL + '/services/data/v65.0/query?q=SELECT+Id,+Name+FROM+Account+LIMIT+10', {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + process.env.BEARERTOKEN,
            }

        })
        console.log('Fetch Account Result:', result.body);
        return result;
    }
    async createAccount() {
        const accountData = {
            Name: "New Account from API"
        };
        const result = await fetch(process.env.ISTANCEURL + '/services/data/v65.0/sobjects/Account/', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + process.env.BEARERTOKEN,
            },
            body: JSON.stringify(accountData)
        });
        console.log('Create Account Result:', result);
        return result;
    }
    async createAccount2() {
        const accountData = {
            phone: "1234567890",
            email: "am@gm.fr",
            firstname: "Amine",
            lastname: "Mokhtari"
        };
        return await handleInsertQuery('/services/data/v65.0/sobjects/', 'Contact/', accountData);
    }

    async stripWebhook(req: any, res: any) {
        this.logger.log('Received Stripe webhook:');
        let payload;
        console.log('req.body', req.body);
        try {
            payload = await req.body;
        } catch (err) {
            console.error("Invalid JSON payload:", err);
            return res.status(400).json({ error: "Invalid payload" });
        }
        const event = payload;
        const object = event?.data?.object;

        if (!object) {
            return res.status(400).json({ error: "Invalid event object" });
        }
        if (
            event.type !== "charge.succeeded" ||
            object.status !== "succeeded"
        ) {
            return res.status(200).json({ message: "Event ignored" });
        }
        const logger = new Logger('StripeWebhook');
        logger.log(`metadata: ${object.metadata.donationID}`);
        console.log('object.billing_details?.Phone', object.billing_details);
        const contacts = await this.contactService.findByPhone(object.billing_details?.Phone);
        const contact = Array.isArray(contacts) ? contacts[0] : contacts;
        if (!contact) {
            return res.status(200).json({ message: "Event ignored" });
        } else {
            const donation = await this.donationService.findOneId(object.metadata.donationID)
            if (donation) {
                donation.StageName = 'Closed Won';

                let transactionData = {
                    IATSPayment__Amount__c: object.amount / 100,
                    IATSPayment__Amount_currency__c: object.currency,
                    donation: object.metadata.donationID,
                    contact: contact.salesforceID,
                    IATSPayment__Method_of_Payment__c: object.payment_method_details?.type,
                    IATSPayment__Status__c: object.status,
                    IATSPayment__Contact__c: contact.salesforceID,
                    transactionID: object.id,
                    IATSPayment__Payer_Address__c: object.billing_details?.address?.line1,
                    IATSPayment__Payer_City__c: object.billing_details?.address?.city,
                    IATSPayment__Payer_State__c: object.billing_details?.address?.state,
                    IATSPayment__Payer_Zip_Code__c: object.billing_details?.address?.postal_code,
                    IATSPayment__Payer_First_Name__c: object.billing_details?.name?.split(' ')[0],
                    IATSPayment__Payer_Last_name__c: object.billing_details?.name?.split(' ')[1] || '',
                    IATSPayment__Credit_Card__c: object.payment_method_details?.card?.last4,
                    IATSPayment__Credit_Card_Type__c: object.payment_method_details?.card?.brand,
                    IATSPayment__Credit_Card_Expiry_Date__c: object.payment_method_details?.card?.exp_month + '/' + object.payment_method_details?.card?.exp_year,
                    Stripe_Customer_ID__c: object.payment_intent || object.id,
                    note: `Transaction created from Stripe webhook for payment intent ${object.payment_intent || object.id}`,
                    salesforceDonation: donation.salesforceID,
                };

                await donation.save();

                //const donationObj = donation.toObject();
                await this.transactionService.create(transactionData);
                
                this.logger.log(`Donation ${donation._id} updated to Closed Won and transaction created.`);
                return res.status(200).json({ message: "Donation and transaction updated" });
            }
        }


        // Here you would process the webhook data as needed
        return { message: 'Webhook received successfully' };
    }
    async createPaymentIntent(req: any, res: any) {
        try {
            this.logger.log(`Creating payment intent for amount: ${req.amount}, currency: ${req.currency}`);

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: req.amount,
                currency: req.currency,
                //customer: customerId,
                //payment_method_types: ['card'],
                metadata: req.metadata || {},
            });
            console.log('Created Payment Intent:', paymentIntent.client_secret);
            res.json({
                clientSecret: paymentIntent.client_secret,
            });
            //return paymentIntent;
        } catch (error) {
            this.logger.error('Error creating payment intent:', error);
            throw error;
        }

    }
}
