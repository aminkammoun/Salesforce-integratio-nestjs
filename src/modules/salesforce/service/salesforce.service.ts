import { Inject, Injectable, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { authenticateSalesforce, handleInsertQuery, handleQuery, handleUpdateQuery } from 'src/config/utils';
import mongoose, { Model } from 'mongoose';
import { Contact } from 'src/modules/contact/entities/contact.entity';
import { InjectModel } from '@nestjs/mongoose';
import { ContactService } from 'src/modules/contact/service/contact.service';
import { DonationService } from 'src/modules/donation/service/donation.service';
import { TransactionService } from 'src/modules/transaction/service/transaction.service';
import { SponsorshipService } from 'src/modules/sponsorship/service/sponsorship.service';
import { RecurringService } from 'src/modules/recurring/service/recurring.service';
import { CartItemDto } from 'src/modules/donation/dto/create-donation.dto';
import { ChildService } from 'src/modules/child/service/child.service';
import { metadata } from 'reflect-metadata/no-conflict';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SalesforceService {
    private stripe: Stripe;
    private readonly logger = new Logger(TransactionService.name);
    private readonly SUPPORTED_WEBSITE_SOURCES = new Set(['US', 'UK', 'CA']);
    private readonly SUPPORTED_CURRENCIES = new Set(['USD', 'CAD', 'GBP']);

    constructor(

        @Inject() private readonly childService: ChildService,
        @Inject() private readonly contactService: ContactService,
        @Inject() private readonly transactionService: TransactionService,
        @Inject() private readonly donationService: DonationService,
        @Inject() private readonly sponsorshipService: SponsorshipService,
        @Inject() private readonly recurringService: RecurringService,
        private readonly eventEmitter: EventEmitter2,

        @Inject('STRIPE_API_KEY') private readonly apiKey: string) {
        this.stripe = new Stripe(this.apiKey, {
            apiVersion: "2025-10-29.clover", // Use whatever API latest version
        });
    }
    async getCustomers() {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(
            'pi_3T1BDBPK7Mt7pUeD0VmA7MeJ'
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
        logger.log(`metadata: ${object.metadata.sponsorshipId}`);
        logger.log(`metadata: ${object.metadata.contactPhone}`);
        const donation = await this.donationService.findOneId(object.metadata.donationID)
        const contacts = await this.contactService.findOne(donation?.contact as string);
        const contact = Array.isArray(contacts) ? contacts[0] : contacts;
        console.log('contact', contact);
        if (!contact) {
            return res.status(200).json({ message: "Event ignored" });
        } else {
            console.log('Donation ID:', object.metadata.donationID);
            //await this.sponsorshipService.updateToActive(sponsorshipId);

            console.log('donation', donation);
            if (donation) {

                /*  let customer: any
                 const cartItems = JSON.parse(object.metadata.cart_items);
                 const recurringItem = cartItems.find(item => item.type === 'Recurring' || item.type === 'Sponsorship');
                 console.log("recurringItem " + recurringItem)
 
                const checkCustomer = await this.stripe.customers.search({
                     query: `metadata['customer_phone']:'${contact.Phone}'`,
                 });
                 customer = checkCustomer.data.length > 0 ? checkCustomer.data[0] : this.createStripeCustomer({
                     email: contact.email,
                     name: contact.Name,
                     phone: contact.Phone,
                 });
                 
                                 // customer = await 
                 
                                 for (let i = 0; i < cartItems.length; i++) {
                                     const item = cartItems[i];
                                     const donationId = object.metadata.donationID;
                                     console.log("khal hna")
                 
                                     if (item.type.toLowerCase() == "recurring" || item.type.toLowerCase() == "sponsorship") {
                                         console.log('customer', customer);
                                         await this.processCartItemAfterPayment({
                                             item,
                                             donationId,
                                             contact,
                                             customer,
                                             object,
                                         });
                                     }
                                 }
                 
                                 //const sponsorshipId = await JSON.parse(event.data.object.metadata.sponsorshipId);
                                 //console.log(sponsorshipId)
                                 const sponsorship = await this.sponsorshipService.findByDonationId(object.metadata.donationID);
                                 console.log('sponsorship ', sponsorship)
                                 for (const sp of sponsorship) {
                                     console.log(sp)
                                     let recurringDonation = {
                                         donorType: "Open",
                                         frequency: sp?.frequency || "Monthly",
                                         customerStipe: (await customer).id,
                                         amount: sp?.Amount || 0,
                                         DayOfMonth: new Date().getDate(),
                                         donations: donation?._id ? (new mongoose.Types.ObjectId(donation._id as string) as unknown as any) : '',
                                         sponsorships: sp._id ? (new mongoose.Types.ObjectId(sp._id as string) as unknown as any) : '',
                                         donor: contact._id ? (new mongoose.Types.ObjectId(contact._id as string) as unknown as any) : '',
                                         status: "Active",
                                         npe03__Contact__c: contact.salesforceID ? contact.salesforceID : null,
                                     };
                                     sp.Status = 'Active';
                                     contact.salesforceID ? sp.Donor__c = contact.salesforceID : null;
                                     const recurring = await this.recurringService.createRecurring(recurringDonation);
                                     console.log('recurring', recurring);
                                     if (!Array.isArray(donation.Recurring)) {
                                         donation.Recurring = [];
                                     }
                                     donation.Recurring.push(new mongoose.Types.ObjectId(recurring._id as string) as unknown as any);
                                     sp.Recurring = recurring._id ? (new mongoose.Types.ObjectId(recurring._id as string) as unknown as any) : '';
                                     sp.save();
                                     if (sp.child && sp.child.length > 0) {
                                         this.childService.updateToSponsored(sp.child);
                                     }
                                 }*/
                donation.StageName = 'Closed Won';
                donation.transactionDetails = {
                    captured: "yes",
                    currency: object.currency,
                    intent_id: object.payment_intent?.toString() || '',
                    source_id: object.payment_method?.toString() || '',
                    customer_id: object.customer?.toString() || '',
                    payment_type: object.payment_method_details?.type || '',
                    charge_id: object.id,
                }
                donation.customerStripe = object.payment_intent;
                console.log(new Date(donation.CloseDate).getTime());
                console.log(object.created * 1000);
                const timeOfProcess = (new Date(donation.CloseDate).getTime() - object.created * 1000) / 1000;
                donation.timeToProcessDonationMs = timeOfProcess;
                this.logger.log(`Time taken to process donation ${donation._id}: ${timeOfProcess} ms`);

                this.logger.log(`Donation ${donation._id} updated to Closed Won and transaction created.`);
                const last4 = object.payment_method_details?.card_present?.last4
                const brand = object.payment_method_details?.card_present?.brand
                const expMonth = object.payment_method_details?.card_present?.exp_month
                const expYear = object.payment_method_details?.card_present?.exp_year
                console.log('last 4 ' + object.payment_method_details?.card_present?.last4)
                console.log('brand ' + object.payment_method_details?.card_present?.brand)
                console.log('expmonth ' + object.payment_method_details?.card_present?.exp_month)
                let transactionData = {
                    Payment__Amount__c: object.amount / 100,
                    Payment__Amount_currency__c: object.currency,
                    donation: object.metadata.donationID,
                    contact: contact.salesforceID,
                    Payment__Method_of_Payment__c: object.payment_method_details?.type,
                    Payment__Status__c: object.status,
                    Payment__Contact__c: contact.salesforceID || <string>contact._id,
                    transactionID: object.id,
                    Payment__Payer_Address__c: object.billing_details?.address?.line1,
                    Payment__Payer_City__c: object.billing_details?.address?.city,
                    Payment__Payer_State__c: object.billing_details?.address?.state,
                    Payment__Payer_Zip_Code__c: object.billing_details?.address?.postal_code,
                    Payment__Payer_First_Name__c: object.billing_details?.name?.split(' ')[0],
                    Payment__Payer_Last_name__c: object.billing_details?.name?.split(' ')[1] || '',
                    Payment__Credit_Card__c: last4,
                    Payment__Credit_Card_Type__c: brand,
                    Payment__Credit_Card_Expiry_Date__c: expMonth + '/' + expYear,
                    Stripe_Customer_ID__c: object.payment_intent || object.id,
                    note: `Transaction created from Stripe webhook for payment intent ${object.payment_intent || object.id}`,
                    salesforceDonation: donation.salesforceID,
                };
                await donation.save();

                const payload = {
                    _id: String(donation._id),
                    StageName: donation.StageName,
                    Donation_Source__c: donation.Donation_Source__c,
                    contact: donation.contact,
                    createdAt: donation.createdDate,
                };
                this.eventEmitter.emit('donation.created', payload);
                await this.transactionService.create(transactionData);
            }
        }


        // Here you would process the webhook data as needed
        return res.status(200).json({ message: "Donation and transaction updated" });
        //return { message: 'Webhook received successfully' };
    }
    async createPaymentIntent(req: any, res: any) {
        try {
            this.logger.log(`Creating payment intent for amount: ${req.amount}, currency: ${req.currency}`);
            const donation = await this.donationService.findOneId(req.metadata.donationID);
            const contact = await this.contactService.findOne(donation?.contact as string);

            this.logger.log(`contact Name: ${contact?.Name}, contact Phone: ${contact?.Phone}`);

            const checkCustomer = await this.stripe.customers.search({
                query: `metadata['customer_phone']:'${contact?.Phone}'`,
            });

            const customer = checkCustomer.data.length > 0
                ? checkCustomer.data[0]
                : await this.createStripeCustomer({
                    email: req.metadata.email,
                    name: contact?.Name,
                    phone: contact?.Phone,
                });
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: req.amount,
                currency: process.env.ENV === 'TEST' ? 'EUR' : req.currency,
                payment_method_types: ['card_present'],
                setup_future_usage: 'off_session',
                capture_method: 'automatic',
                customer: customer.id,
                //payment_method_types: ['card'],
                metadata: req.metadata || {},
            });
            console.log('Created Payment Intent:', paymentIntent.id);
            res.json({
                id: paymentIntent.id,
                clientSecret: paymentIntent.client_secret,
            });
            //return paymentIntent;
        } catch (error) {
            this.logger.error('Error creating payment intent:', error);
            throw error;
        }
    }
    async createStripeCustomer(req: any) {
        try {
            this.logger.log(`Creating Stripe customer for email: ${req.email}`);
            const customer = await this.stripe.customers.create({
                email: req.email ?? undefined,
                name: req.name ?? undefined,
                phone: req.phone ?? undefined,
                // In case Stripe ignores top-level fields, ALWAYS store here
                metadata: {
                    customer_name: req.name || "",
                    customer_phone: req.phone || "",
                    ...(req.metadata || {})
                },
            });
            console.log('Created Customer:', customer.id);
            return customer;
        } catch (error) {
            this.logger.error('Error creating customer:', error);
            throw error;
        }
    }
    async updateDefaultPM(req: any, res: any) {
        const result = await this.stripe.customers.update(req.customerId, {
            invoice_settings: {
                default_payment_method: req.paymentMethod
            }
        });
        return result
    }
    async createStripePrice(req: any, res: any) {
        try {
            this.logger.log(
                `Creating Stripe price for product: ${req.productId}, amount: ${req.amount}, currency: ${req.currency}`
            );

            const price = await this.stripe.prices.create({
                unit_amount: Number(req.amount) * 100,   // ensure number
                currency: req.currency,
                recurring: {
                    interval: req.recurring.interval.toLowerCase(), // <-- correct
                },
                product: req.productId,
                metadata: req.metadata || {},
            });

            console.log('Created Price:', price.id);
            return price;

        } catch (error) {
            this.logger.error('Error creating price:', error);
            throw error;
        }
    }
    async createStripeSubscription(req: any, res: any) {
        try {
            this.logger.log(`Creating Stripe subscription for customer: ${req.customerId}, priceId: ${req.priceId}`);
            const subscription = await this.stripe.subscriptions.create({
                customer: req.customerId,
                items: [{ price: req.priceId }],
                trial_end: req.trial_end, // NEW: prevent immediate charge
                //billing_cycle_anchor: req.billing_cycle_anchor, // NEW: set billing date
                //backdate_start_date: req.backdate_start_date,
                metadata: req.metadata || {},
                proration_behavior: 'none',
                expand: ['latest_invoice.payment_intent'],
            });
            console.log('Created Subscription:', subscription.id);
            return subscription;

        } catch (error) {
            this.logger.error('Error creating subscription:', error);
            throw error;
        }
    }
    async createTerminalReader(res: any) {
        let connectionToken = await this.stripe.terminal.connectionTokens.create();
        res.json({ secret: connectionToken.secret });

    }
    async retrievePaymentIntent(id: string) {
        try {
            const result = await this.stripe.paymentIntents.retrieve(id);
            console.log('Retrieved Payment Intent:', result);
            if (!result) {
                throw new Error('Payment Intent not found');
            }
            return result;
        }

        catch (error) {
            this.logger.error('Error retrieving payment intent:', error);
            throw error;
        }
    }
    async collectPaymentMethod(readerId: string, paymentIntentId: string) {
        try {
            console.log('Collecting payment method for reader:', readerId, 'and payment intent:', paymentIntentId);
            const result = await this.stripe.terminal.readers.collectPaymentMethod(readerId, {
                payment_intent: paymentIntentId,
            });
            return result;
        } catch (error) {
            this.logger.error('Error collecting payment method:', error);
            throw error;
        }
    }
    async linkPaymentMethodToCustomer(paymentId: string, customerId: string) {
        try {
            // 1. Attach payment method to customer
            const attachedPaymentMethod = await this.stripe.paymentMethods.attach(
                paymentId,
                { customer: customerId }
            );

            // 2. Set as default payment method for invoices (important!)
            await this.stripe.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentId,
                }
            });

            return attachedPaymentMethod;

        } catch (error) {
            console.error("Error linking payment method:", error);
            throw error;
        }
    }
    private mapIntervalToFrequency(interval: string): string {
        const map = {
            monthly: 'Monthly',
            quarterly: 'Quarterly',
            yearly: 'Yearly',
        };
        return map[interval] || 'One-Time';
    }
    private mapIntervalToStripeInterval(interval: string) {
        const map = {
            monthly: { interval: 'month', interval_count: 1 },
            quarterly: { interval: 'month', interval_count: 3 },
            yearly: { interval: 'year', interval_count: 1 },
        };
        return map[interval.toLowerCase()] || { interval: 'month', interval_count: 1 };
    }

    // Improved billing date calculation
    /*private calculateNextBillingDate(interval: string): number {
        const now = Math.floor(Date.now() / 1000);
        const days = {
            monthly: 30,
            quarterly: 90,
            yearly: 365,
        };
        const daysToAdd = days[interval.toLowerCase()] || 30;
        return now + (daysToAdd * 24 * 60 * 60);
    }*/


    private calculateNextBillingDate(interval: string): number {
        const date = new Date();

        switch (interval.toLowerCase()) {
            case 'monthly':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'quarterly':
                date.setMonth(date.getMonth() + 3);
                break;
            case 'yearly':
                date.setFullYear(date.getFullYear() + 1);
                break;
            default:
                date.setMonth(date.getMonth() + 1);
        }

        return Math.floor(date.getTime() / 1000);
    }

    private async processCartItemAfterPayment(params: {
        item: CartItemDto;
        donationId: string;
        contact: any;
        customer: any;
        object?: any;
        paymentMethod?: any;
    }) {
        const { item, donationId, contact, customer, object } = params;

        const donation = await this.donationService.findOneId(donationId);
        if (!donation) {
            throw new Error(`Donation ${donationId} not found`);
        }

        // Update donation status
        donation.StageName = 'Closed Won';

        if (item.type === 'one-time') {
            // One-time donation - just update status
            await donation.save();
            this.logger.log(`One-time donation ${donationId} marked as Closed Won`);
            return;
        }

        // For recurring donations/sponsorships
        if (!customer) {
            throw new Error('Stripe customer required for recurring donations');
        }

        donation.customerStripe = customer.id;

        // Create Stripe price
        const interval = this.mapIntervalToStripeInterval(item.interval);
        console.log('interval', interval);
        const priceCheck = await this.stripe.prices.search({
            query: `product:"prod_TYxTnm0rvxuSWn" AND metadata['price']:'${item.amount}' AND metadata['interval']:'${item.interval}'`,
        });
        let price;
        if (priceCheck.data.length > 0) {
            price = priceCheck.data[0];
        } else {
            price = await this.createStripePrice({
                amount: item.amount,
                currency: "usd",
                recurring: {
                    interval: interval.interval,
                    interval_count: interval.interval_count,
                },
                productId: "prod_TYxTnm0rvxuSWn", // Use env variable
                //productId: "prod_TVy2unytb3L8hZ", // Use env variable
                product_data: {
                    name: item.type === 'recurring'
                        ? `Recurring Donation - ${item.programId}`
                        : `Child Sponsorship - ${item.nationality}`,
                },
                metadata: {
                    price: item.amount
                }
            }, {});
        }
        // Calculate when subscription should start billing
        const billingCycleAnchor = this.calculateNextBillingDate(item.interval);
        console.log(billingCycleAnchor)
        const now = Math.floor(new Date('2026-01-17').getTime() / 1000);
        // Create Stripe subscription with trial to prevent immediate charge
        const subscription = await this.createStripeSubscription({
            customerId: customer.id,
            priceId: price.id,
            trial_end: billingCycleAnchor, // Don't charge until next period
            //billing_cycle_anchor: billingCycleAnchor,
            //backdate_start_date: Math.floor(Date.now() / 1000),
            payment_behavior: 'default_incomplete',
            default_payment_method: object.payment_method_details.card_present.generated_card || params.paymentMethod,
            metadata: {
                donationId: donationId,
                contactId: contact._id.toString(),
                type: item.type,
            },
        }, {});

        this.logger.log(`Created subscription ${subscription.id} for ${item.type}`);
        return { subs: subscription.id, customer: customer.id };

    }
    async createRecurringOnStripe(id?: string) {
        //const customer = await this.stripe.customers.retrieve(req.customerId);
        //console.log('Customer retrieved:', customer);
        //const interval = this.mapIntervalToStripeInterval(req.interval);
        const recurring = await this.recurringService.findAll();
        console.log('Found recurrings:', recurring.length);
        if (!recurring || recurring.length === 0) {
            this.logger.warn('No recurring donations found');
            return;
        }
        for (const rec of recurring) {
            try {


                const donationId = rec?.donations?.toString();
                const donation = await this.donationService.findOneId(donationId);
                const contact = await this.contactService.findOne(rec?.donor?.toString());
                if (!contact) {
                    throw new Error(`Contact ${rec?.donor?.toString()} not found`);
                }
                let customer: any
                const checkCustomer = await this.stripe.customers.search({
                    query: `metadata['customer_phone']:'${contact.Phone}'`,
                });
                customer = checkCustomer.data.length > 0 ? checkCustomer.data[0] : this.createStripeCustomer({
                    email: contact.email,
                    name: contact.Name,
                    phone: contact.Phone,
                });
                console.log('customer', customer.id);
                if (!donation) {
                    throw new Error(`Donation ${donationId} not found`);
                }

                if (donation.Donation_Source__c == 'Fundraising App') {
                    console.log("khal hna")
                    const transaction = await this.transactionService.findByDonationId(donationId);
                    console.log('transaction', transaction);
                    if (!transaction) {
                        throw new Error(`Transaction for donation ${donationId} not found`);
                    }
                    const stripeGetChargeEvent = await this.stripe.charges.retrieve(transaction[0].transactionID);

                    const generatedCard = stripeGetChargeEvent?.payment_method_details?.card_present?.generated_card;
                    console.log('generatedCard', generatedCard);
                    if (generatedCard) {
                        await this.linkPaymentMethodToCustomer(generatedCard, customer.id);
                    }
                    const processCartItemAfterPayment = await this.processCartItemAfterPayment({
                        item: donation.cartItems[0],
                        donationId: donationId,
                        contact: contact,
                        customer: customer,
                        object: stripeGetChargeEvent,
                    });
                    rec.customerStripe = processCartItemAfterPayment?.customer || '';
                    rec.subscriptionStripe = processCartItemAfterPayment?.subs || '';
                    rec.createOnStripe = true;
                } else {
                    const subscriptions = await this.stripe.subscriptions.list({
                        customer: customer.id,
                        limit: 1,
                    });
                    const stripeSubscriptionid = subscriptions.data[0];
                    rec.customerStripe = donation.transactionDetails.customer_id || '';
                    rec.subscriptionStripe = stripeSubscriptionid.id;
                    rec.createOnStripe = true;
                }
                /*donation.transactionDetails = {
                    captured: "yes",
                    currency: stripeGetChargeEvent.currency,
                    intent_id: stripeGetChargeEvent.payment_intent?.toString() || '',
                    source_id: stripeGetChargeEvent.payment_method?.toString() || '',
                    customer_id: stripeGetChargeEvent.customer?.toString() || '',
                }
                await donation.save();*/
                await rec.save();
                this.logger.log(`Successfully processed recurring donation ${rec._id}`);

            } catch (error) {
                this.logger.error(`Error processing recurring ${rec._id}:`, error.message);
                continue; // Continue with next recurring donation instead of failing entire process
            }
        }

    }


    async createOneRecurringOnStripe(id?: string) {
        //const customer = await this.stripe.customers.retrieve(req.customerId);
        //console.log('Customer retrieved:', customer);
        //const interval = this.mapIntervalToStripeInterval(req.interval);
        const recurring = await this.recurringService.findAll2(id);
        console.log('Found recurrings:', recurring.length);
        if (!recurring || recurring.length === 0) {
            this.logger.warn('No recurring donations found');
            return { message: 'No recurring donations found or recurring already processed' };
        }
        for (const rec of recurring) {
            try {


                const donationId = rec?.donations?.toString();
                const donation = await this.donationService.findOneId(donationId);
                const contact = await this.contactService.findBySfId(rec?.npe03__Contact__c?.toString());
                if (!contact) {
                    throw new Error(`Contact ${rec?.npe03__Contact__c?.toString()} not found`);
                }
                let customer: any
                const checkCustomer = await this.stripe.customers.search({
                    query: `metadata['customer_phone']:'${contact.Phone}'`,
                });
                customer = checkCustomer.data.length > 0 ? checkCustomer.data[0] : this.createStripeCustomer({
                    email: contact.email,
                    name: contact.Name,
                    phone: contact.Phone,
                });
                console.log('customer', customer.id);
                if (!donation) {
                    throw new Error(`Donation ${donationId} not found`);
                }

                if (donation.Donation_Source__c == 'Fundraising App') {
                    console.log("khal hna")
                    const transaction = await this.transactionService.findByDonationId(donationId);
                    console.log('transaction', transaction);
                    if (!transaction) {
                        throw new Error(`Transaction for donation ${donationId} not found`);
                    }
                    const stripeGetChargeEvent = await this.stripe.charges.retrieve(transaction[0].transactionID);

                    const generatedCard = stripeGetChargeEvent?.payment_method_details?.card_present?.generated_card;
                    console.log('generatedCard', generatedCard);
                    if (generatedCard) {
                        const customerPaymentMethods = await this.stripe.customers.listPaymentMethods(customer.id);
                        const isAlreadyLinked = customerPaymentMethods.data.some(pm => pm.id === generatedCard);
                        if (!isAlreadyLinked) {
                            await this.linkPaymentMethodToCustomer(generatedCard, customer.id);
                        }
                    }
                    const processCartItemAfterPayment = await this.processCartItemAfterPayment({
                        item: donation.cartItems[0],
                        donationId: donationId,
                        contact: contact,
                        customer: customer,
                        object: stripeGetChargeEvent,
                    });
                    rec.customerStripe = processCartItemAfterPayment?.customer || '';
                    rec.subscriptionStripe = processCartItemAfterPayment?.subs || '';
                    rec.createOnStripe = true;
                    const recurringPayloadToUpdateOnSF = {
                        Stripe_subscription_url__c: 'https://dashboard.stripe.com/acct_1S5xcLPK7Mt7pUeD/subscriptions/' + processCartItemAfterPayment?.subs,
                        Stripe_Customer__c: processCartItemAfterPayment?.customer || '',
                    }
                    const token = await authenticateSalesforce();
                    await handleUpdateQuery('/services/data/v65.0/sobjects/', `npe03__Recurring_Donation__c`, rec.salesforceID.toString(), recurringPayloadToUpdateOnSF, token);
                } else {
                    const subscriptions = await this.stripe.subscriptions.list({
                        customer: customer.id,
                        limit: 1,
                    });
                    const stripeSubscriptionid = subscriptions.data[0];
                    rec.customerStripe = donation.transactionDetails.customer_id || '';
                    rec.subscriptionStripe = stripeSubscriptionid.id;
                    rec.createOnStripe = true;
                }
                /*donation.transactionDetails = {
                    captured: "yes",
                    currency: stripeGetChargeEvent.currency,
                    intent_id: stripeGetChargeEvent.payment_intent?.toString() || '',
                    source_id: stripeGetChargeEvent.payment_method?.toString() || '',
                    customer_id: stripeGetChargeEvent.customer?.toString() || '',
                }
                await donation.save();*/
                await rec.save();
                this.logger.log(`Successfully processed recurring donation ${rec._id}`);
                return { sub: rec.subscriptionStripe, customer: rec.customerStripe };

            } catch (error) {
                this.logger.error(`Error processing recurring ${rec._id}:`, error.message);
                continue; // Continue with next recurring donation instead of failing entire process
            }
        }

    }
    /* async updateRecurringsWithStripeIds(subId: string, customerId: string, iatsCustomerCode: string) {
         const recurringPayloadToUpdateOnSF = {
             Stripe_subscription_url__c: 'https://dashboard.stripe.com/acct_1S5xcLPK7Mt7pUeD/subscriptions/' + subId,
             Stripe_Customer__c: customerId || '',
         }
         const token = await authenticateSalesforce();
         await handleUpdateQuery('/services/data/v65.0/sobjects/', `npe03__Recurring_Donation__c`, rec.salesforceID.toString(), recurringPayloadToUpdateOnSF, token);
     }*/
    /*async updateRecurringsWithContactSalesforceID() {
        const recurrings = await this.recurringService.findAll();
        for (const rec of recurrings) {
            try {
                const donation = await this.donationService.findOneId(rec?.donations?.toString());
                const contact = await this.contactService.findOne(rec?.donor?.toString());
                if (contact && contact.salesforceID && !rec.npe03__Contact__c) {
                    rec.npe03__Contact__c = contact.salesforceID;
                    await rec.save();
                    if (donation) {
                        donation.npsp__Primary_Contact__c = contact.salesforceID;
                        await donation.save();
                    }
                    //const sponsorship = await this.sponsorshipService.updateSpBycontactSfId((contact._id as string).toString(), contact?.salesforceID.toString());

                    this.logger.log(`Updated recurring ${rec._id} with Contact Salesforce ID ${contact.salesforceID}`);
                }
            } catch (error) {
                this.logger.error(`Error updating recurring ${rec._id}:`, error.message);
                continue; // Continue with next recurring donation instead of failing entire process
            }
        }
    }*/
    //    async createCampaignInSalesforce() {
    //     const 
    //    }

    async checkRecurringIsCreatedOnstripe(id: string) {
        try {
            console.log(id)
            const query = `SELECT Name, IsDeleted, IATS_recurring__Recurring_Donation__c, IATS_recurring__Recurring_Donation__r.Stripe_Subscription__c, IATS_recurring__Recurring_Donation__r.Stripe_ID__c, IATS_recurring__Recurring_Donation__r.Stripe_subscription_url__c
                FROM IATSPayment__IATS_Customer_Code__c
                WHERE Name = '${id}' and IATS_recurring__Recurring_Donation__r.Stripe_subscription_url__c = null`;
            const token = await authenticateSalesforce();
            console.log(token)
            const res = await handleQuery('/services/data/v65.0/query/?q=', query, token);
            if (res.records.length === 0) {
                return {
                    isCreated: true
                };
            }
            return {
                isCreated: false
            };
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

  async getSubPrograms() {
    try {
      const token = await authenticateSalesforce();
      
      const query = `
        SELECT Id, Name 
        FROM pmdm__ProgramCohort__c 
        ORDER BY Name ASC
      `.replace(/\s+/g, ' ').trim();

      const result = await handleQuery('/services/data/v65.0/query/?q=', query, token);
      const records = result?.records || [];

      const subPrograms = records.map((p: any) => ({
        salesforce_reference_id: p.Id,
        title: p.Name,
      }));

      return {
        success: true,
        sub_programs: subPrograms,
      };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to fetch sub-programs: ${error.message}`);
    }
  }

  async getCampaignDetails(campaignId: string) {
    if (!campaignId) {
      throw new BadRequestException('Campaign ID is required.');
    }

    const token = await authenticateSalesforce();

    const query = `
      SELECT Id, Name, Status, P2P_Owner__c, P2P_Owner__r.Name, Description, 
             Featured_Image__c, StartDate, EndDate, Revenue_Goal_in_Local_Currency__c, 
             P2P_Link__c, Campaign_Currency__c, Value_Won_Donations_in_Local_Currency__c, 
             NumberOfContacts, ProgramCohort1__c, ProgramCohort2__c, ProgramCohort3__c, 
             ProgramCohort4__c, ProgramCohort1__r.Name, ProgramCohort2__r.Name, 
             ProgramCohort3__r.Name, ProgramCohort4__r.Name,
             (SELECT Id, Name, AmountinLocalCurrency__c, CreatedDate, Currency_Type__c, 
                     npsp__Primary_Contact__c, npsp__Primary_Contact__r.Name, AccountId, Account.Name 
              FROM Opportunities 
              ORDER BY CreatedDate DESC 
              LIMIT 20)
      FROM Campaign
      WHERE Name = '${campaignId}' OR Id = '${campaignId}'
      LIMIT 1
    `.replace(/\s+/g, ' ').trim();

    const result = await handleQuery('/services/data/v65.0/query/?q=', query, token);
    const campaigns = result?.records || [];

    if (!campaigns.length) {
      return null;
    }

    const c = campaigns[0];
    return {
      success: true,
      campaign: this.mapCampaignDetail(c),
    };
  }

  async getUserCampaigns(userId: string, page = 1, perPage = 10) {
    if (!userId) {
      throw new BadRequestException('salesforceUserReferenceId is required.');
    }

    page = Math.max(1, page);
    perPage = Math.min(100, Math.max(1, perPage));

    const token = await authenticateSalesforce();

    // Step A: Aggregate Totals Across ALL User Campaigns
    const countQuery = `
      SELECT COUNT(Id) totalCount, 
             SUM(Value_Won_Donations_in_Local_Currency__c) totalRaised, 
             SUM(NumberOfContacts) totalDonors 
      FROM Campaign 
      WHERE P2P_Owner__c = '${userId}'
    `.replace(/\s+/g, ' ').trim();

    const totalsResult = await handleQuery('/services/data/v65.0/query/?q=', countQuery, token);
    const aggregateRecord = totalsResult?.records?.[0] || {};

    const totalRecords = aggregateRecord.totalCount || 0;
    const amountRaised = aggregateRecord.totalRaised || 0.0;
    const donorCount = aggregateRecord.totalDonors ? parseInt(aggregateRecord.totalDonors, 10) : 0;
    const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / perPage);

    if (totalRecords === 0) {
      return {
        success: true,
        campaigns: [],
        pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
        totals: { amount_raised: 0.0, donor_count: 0 },
      };
    }

    // Step B: Query Paginated Campaign Records
    const offset = (page - 1) * perPage;
    const campaignsQuery = `
      SELECT Id, Name, Status, P2P_Owner__c, P2P_Owner__r.Name, Description, 
             Featured_Image__c, StartDate, EndDate, Revenue_Goal_in_Local_Currency__c, 
             P2P_Link__c, Campaign_Currency__c, Value_Won_Donations_in_Local_Currency__c, 
             NumberOfContacts, ProgramCohort1__c, ProgramCohort2__c, ProgramCohort3__c, 
             ProgramCohort4__c, ProgramCohort1__r.Name, ProgramCohort2__r.Name, 
             ProgramCohort3__r.Name, ProgramCohort4__r.Name,
             (SELECT Id, Name, AmountinLocalCurrency__c, CloseDate, npsp__Primary_Contact__c, 
                     npsp__Primary_Contact__r.Name, AccountId, Account.Name 
              FROM Opportunities 
              WHERE IsWon = true 
              ORDER BY CloseDate DESC 
              LIMIT 20)
      FROM Campaign
      WHERE P2P_Owner__c = '${userId}'
      ORDER BY CreatedDate DESC
      LIMIT ${perPage} OFFSET ${offset}
    `.replace(/\s+/g, ' ').trim();

    const campaignsResult = await handleQuery('/services/data/v65.0/query/?q=', campaignsQuery, token);
    const campaignsList = (campaignsResult?.records || []).map((c: any) => this.mapCampaignDetail(c));

    return {
      success: true,
      campaigns: campaignsList,
      pagination: {
        page,
        per_page: perPage,
        total: totalRecords,
        total_pages: totalPages,
      },
      totals: {
        amount_raised: amountRaised,
        donor_count: donorCount,
      },
    };
  }

  async createCampaign(dto: any) {
    // 1. DTO Validation
    this.validateCampaignPostRequest(dto);

    const token = await authenticateSalesforce();
    const p2pRecordTypeId = await this.getP2PRecordTypeId(token);

    // 2. Contact Lookup / Resolution
    const contactId = await this.resolveOrCreateContact(dto, token);

    // 3. Prepare Campaign Record Payload
    const campaignPayload: Record<string, any> = {
      RecordTypeId: p2pRecordTypeId,
      Name: `${dto.organizer_first_name} ${dto.organizer_last_mame} - P2P Campaign (${dto.website_source.toUpperCase()})`,
      Description: dto.campaign_description || null,
      StartDate: dto.start_date,
      EndDate: dto.end_date,
      Featured_Image__c: dto.featured_image_url || null,
      P2P_Owner__c: contactId,
      Campaign_Currency__c: dto.campaign_currency.toUpperCase(),
      Revenue_Goal_in_Local_Currency__c: dto.campaign_goal_amount,
    };

    if (dto.p2p_page_link) {
      campaignPayload.P2P_Link__c = dto.p2p_page_link;
    }

    // Dynamically assign up to 4 Program Cohort IDs
    const cohortFields = ['ProgramCohort1__c', 'ProgramCohort2__c', 'ProgramCohort3__c', 'ProgramCohort4__c'];
    (dto.program_cohort_ids || []).forEach((cohortId: string, idx: number) => {
      if (idx < 4) campaignPayload[cohortFields[idx]] = cohortId;
    });

    // 4. Insert Campaign SObject using standard handleInsertQuery
    const res = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Campaign', campaignPayload, token);

    if (res?.salesforceId || res?.id) {
      return {
        success: true,
        message: 'Campaign created successfully.',
        campaignId: res.salesforceId || res.id,
      };
    }

    throw new InternalServerErrorException('Failed to create Campaign record in Salesforce.');
  }

  // --- PRIVATE HELPER METHODS ---

  private validateCampaignPostRequest(req: any) {
    const errors: string[] = [];

    if (!req) throw new BadRequestException(['Request body cannot be empty.']);

    if (!req.website_source || !this.SUPPORTED_WEBSITE_SOURCES.has(req.website_source.toUpperCase())) {
      errors.push('website_source must be one of: US, UK, CA.');
    }
    if (!req.organizer_first_name) errors.push('organizer_first_name is required.');
    if (!req.organizer_last_mame) errors.push('organizer_last_mame is required.');
    if (!req.email) errors.push('email is required.');
    if (!req.phone) errors.push('phone is required.');
    if (!req.organizer_word_press_id) errors.push('organizer_word_press_id is required.');

    if (!req.campaign_currency || !this.SUPPORTED_CURRENCIES.has(req.campaign_currency.toUpperCase())) {
      errors.push('campaign_currency must be one of: USD, CAD, GBP.');
    }
    if (!req.campaign_goal_amount || req.campaign_goal_amount <= 0) {
      errors.push('campaign_goal_amount is required and must be greater than zero.');
    }
    if (!req.start_date) errors.push('start_date is required');
    if (!req.end_date) errors.push('end_date is required');

    if (!req.program_cohort_ids?.length) {
      errors.push('At least one Program Cohort ID must be provided in program_cohort_ids list.');
    } else if (req.program_cohort_ids.length > 4) {
      errors.push('A maximum of 4 Program Cohort IDs can be passed in program_cohort_ids list.');
    } else {
      req.program_cohort_ids.forEach((id: string, i: number) => {
        if (id && id.length !== 18) errors.push(`program_cohort_ids[${i + 1}] must be a valid 18-digit Salesforce ID.`);
      });
    }

    if (req.salesforce_user_reference_id && req.salesforce_user_reference_id.length !== 18) {
      errors.push('salesforce_user_reference_id must be a valid 18-digit Salesforce ID.');
    }

    if (errors.length > 0) {
      throw new BadRequestException({ success: false, message: 'Validation failed.', errors });
    }
  }

  private async resolveOrCreateContact(req: any, token: string): Promise<string> {
    const territory = req.website_source.toUpperCase();

    // Step 1: Explicit SF Contact ID provided
    if (req.salesforce_user_reference_id) {
      const q = `SELECT Id FROM Contact WHERE Id = '${req.salesforce_user_reference_id}' LIMIT 1`;
      const res = await handleQuery('/services/data/v65.0/query/?q=', q, token);
      if (res?.records?.length) return res.records[0].Id;
    }

    // Step 2: Query by WordPress ID + Territory
    const wpQuery = `SELECT Id FROM Contact WHERE Word_Press_Id__c = '${req.organizer_word_press_id}' AND Territory_Based_On_Role__c = '${territory}' LIMIT 1`;
    const wpRes = await handleQuery('/services/data/v65.0/query/?q=', wpQuery, token);
    if (wpRes?.records?.length) return wpRes.records[0].Id;

    // Step 3: Direct Query Fallback on Email/Phone + Territory
    const epQuery = `SELECT Id FROM Contact WHERE (Email = '${req.email}' OR Phone = '${req.phone}') AND Territory_Based_On_Role__c = '${territory}' ORDER BY CreatedDate DESC LIMIT 1`;
    const epRes = await handleQuery('/services/data/v65.0/query/?q=', epQuery, token);
    if (epRes?.records?.length) return epRes.records[0].Id;

    // Step 4: Create New Contact Record
    const contactPayload = {
      FirstName: req.organizer_first_name,
      LastName: req.organizer_last_mame,
      Email: req.email,
      Phone: req.phone,
      Word_Press_Id__c: req.organizer_word_press_id
    };

    const insertRes = await handleInsertQuery('/services/data/v65.0/sobjects/', 'Contact', contactPayload, token);
    if (insertRes?.salesforceId || insertRes?.id) {
      return insertRes.salesforceId || insertRes.id;
    }

    throw new InternalServerErrorException('Failed to create Contact record in Salesforce.');
  }

private async getP2PRecordTypeId(token: string): Promise<string> {
    const query = `
        SELECT Id 
        FROM RecordType 
        WHERE SobjectType = 'Campaign' AND DeveloperName = 'P2P' 
        LIMIT 1
    `.replace(/\s+/g, ' ').trim();

    const res = await handleQuery('/services/data/v65.0/query/?q=', query, token);
    if (res?.records?.length) {
        return res.records[0].Id;
    }
    throw new InternalServerErrorException('P2P Campaign Record Type not found in Salesforce.');
    }

  private mapCampaignDetail(c: any) {
    const startDate = c.StartDate || null;
    const endDate = c.EndDate || null;

    let durationDays: number | null = null;
    let daysRemaining = 0;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    }

    if (endDate) {
      const end = new Date(endDate);
      const today = new Date();
      const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
      daysRemaining = diff < 0 ? 0 : diff;
    }

    // Map up to 4 Cohorts
    const subPrograms: any[] = [];
    const cohorts = [
      { id: c.ProgramCohort1__c, name: c.ProgramCohort1__r?.Name },
      { id: c.ProgramCohort2__c, name: c.ProgramCohort2__r?.Name },
      { id: c.ProgramCohort3__c, name: c.ProgramCohort3__r?.Name },
      { id: c.ProgramCohort4__c, name: c.ProgramCohort4__r?.Name },
    ];

    cohorts.forEach((cohort) => {
      if (cohort.id) {
        subPrograms.push({
          salesforce_reference_id: cohort.id,
          title: cohort.name || null,
        });
      }
    });

    // Map child Opportunity donations
    const donations: any[] = [];
    if (c.Opportunities?.records) {
      c.Opportunities.records.forEach((opp: any) => {
        let donorName = 'Anonymous Donor';
        if (opp.npsp__Primary_Contact__r?.Name) {
          donorName = opp.npsp__Primary_Contact__r.Name;
        } else if (opp.Account?.Name) {
          donorName = opp.Account.Name;
        }

        donations.push({
          donor_name: donorName,
          amount: opp.AmountinLocalCurrency__c || 0,
          created_at: opp.CloseDate || opp.CreatedDate || null,
          donationCurrency: opp.Currency_Type__c || null,
        });
      });
    }

    return {
      id: c.Id,
      status: c.Status,
      salesforce_user_reference_id: c.P2P_Owner__c,
      organizer_display_name: c.P2P_Owner__r?.Name || null,
      campaign_description: c.Description || null,
      featured_image_url: c.Featured_Image__c || null,
      duration_days: durationDays,
      start_date: startDate,
      end_date: endDate,
      days_remaining: daysRemaining,
      goal: c.Revenue_Goal_in_Local_Currency__c || 0,
      amount_raised: c.Value_Won_Donations_in_Local_Currency__c || 0.0,
      donor_count: c.NumberOfContacts ? parseInt(c.NumberOfContacts, 10) : 0,
      public_url: c.P2P_Link__c || null,
      campaign_currency: c.Campaign_Currency__c || null,
      sub_programs: subPrograms,
      donations,
    };
  }
}
