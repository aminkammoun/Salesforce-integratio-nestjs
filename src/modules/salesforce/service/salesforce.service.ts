import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { handleInsertQuery } from 'src/config/utils';
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
@Injectable()
export class SalesforceService {
    private stripe: Stripe;
    private readonly logger = new Logger(TransactionService.name);

    constructor(

        @Inject() private readonly childService: ChildService,
        @Inject() private readonly contactService: ContactService,
        @Inject() private readonly transactionService: TransactionService,
        @Inject() private readonly donationService: DonationService,
        @Inject() private readonly sponsorshipService: SponsorshipService,
        @Inject() private readonly recurringService: RecurringService,
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

                let customer: any
                const cartItems = JSON.parse(object.metadata.cart_items);
                const recurringItem = cartItems.find(item => item.type === 'Recurring');
                console.log("recurringItem " + recurringItem)
                if (recurringItem) {
                    const checkCustomer = await this.stripe.customers.search({
                        query: `metadata['customer_phone']:'${contact.Phone}'`,
                    });
                    customer = checkCustomer.data.length > 0 ? checkCustomer.data[0] : this.createStripeCustomer({
                        email: contact.email,
                        name: contact.Name,
                        phone: contact.Phone,
                    });

                    // customer = await 
                }
                for (let i = 0; i < cartItems.length; i++) {
                    const item = cartItems[i];
                    const donationId = object.metadata.donationID;
                    console.log("khal hna")

                    if (item.type == "Recurring" || item.type == "Sponsorship") {
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

                const sponsorshipId = JSON.parse(event.data.object.metadata.sponsorshipId);
                console.log(sponsorshipId)
                const sponsorship = await this.sponsorshipService.findByIds(sponsorshipId);
                console.log(sponsorship)
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
                    };
                    sp.Status = 'Active';
                    const recurring = await this.recurringService.createRecurring(recurringDonation);
                    console.log('recurring', recurring);
                    if (!Array.isArray(donation.Recurring)) {
                        donation.Recurring = [];
                    }
                    donation.Recurring.push(new mongoose.Types.ObjectId(recurring._id as string) as unknown as any);
                    sp.Recurring = recurring._id ? (new mongoose.Types.ObjectId(recurring._id as string) as unknown as any) : '';
                    sp.save();
                    this.childService.updateToSponsored(sp.child);
                }
                donation.StageName = 'Closed Won';
                donation.customerStipe = object.payment_intent;
                console.log(new Date(donation.CloseDate).getTime());
                console.log(object.created* 1000);
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
                    IATSPayment__Amount__c: object.amount / 100,
                    IATSPayment__Amount_currency__c: object.currency,
                    donation: object.metadata.donationID,
                    contact: contact.salesforceID,
                    IATSPayment__Method_of_Payment__c: object.payment_method_details?.type,
                    IATSPayment__Status__c: object.status,
                    IATSPayment__Contact__c: contact.salesforceID || <string>contact._id,
                    transactionID: object.id,
                    IATSPayment__Payer_Address__c: object.billing_details?.address?.line1,
                    IATSPayment__Payer_City__c: object.billing_details?.address?.city,
                    IATSPayment__Payer_State__c: object.billing_details?.address?.state,
                    IATSPayment__Payer_Zip_Code__c: object.billing_details?.address?.postal_code,
                    IATSPayment__Payer_First_Name__c: object.billing_details?.name?.split(' ')[0],
                    IATSPayment__Payer_Last_name__c: object.billing_details?.name?.split(' ')[1] || '',
                    IATSPayment__Credit_Card__c: last4,
                    IATSPayment__Credit_Card_Type__c: brand,
                    IATSPayment__Credit_Card_Expiry_Date__c: expMonth + '/' + expYear,
                    Stripe_Customer_ID__c: object.payment_intent || object.id,
                    note: `Transaction created from Stripe webhook for payment intent ${object.payment_intent || object.id}`,
                    salesforceDonation: donation.salesforceID,
                };
                await donation.save();
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

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: req.amount,
                currency: req.currency,
                //setup_future_usage: 'off_session',
                //payment_method_types: ['card_present'],
                //capture_method: 'automatic',
                //customer: req.customerId,
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
                //trial_end: req.trial_end, // NEW: prevent immediate charge
                billing_cycle_anchor: req.billing_cycle_anchor, // NEW: set billing date
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
    async linkPaymentMethodToCustomer(req: any) {
        try {
            // 1. Attach payment method to customer
            const attachedPaymentMethod = await this.stripe.paymentMethods.attach(
                req.paymentId,
                { customer: req.customerId }
            );

            // 2. Set as default payment method for invoices (important!)
            await this.stripe.customers.update(req.customerId, {
                invoice_settings: {
                    default_payment_method: req.paymentId,
                }
            });

            return attachedPaymentMethod;

        } catch (error) {
            console.error("Error linking payment method:", error);
            throw error;
        }
    }
    async setupIntents(req: any, res: any) {
        console.log(req.customerId)
        const setupIntent = await this.stripe.setupIntents.create({
            customer: req.customerId,
            payment_method_types: ['card_present'],
            usage: 'off_session'
        });
        console.log(setupIntent)
        return setupIntent
        // 2. Collect via terminal (just saves card, no charge)
        //await this.stripe.terminal.readers.processSetupIntent(readerId, setupIntent.id);

        // 3. Create subscription (first charge happens automatically)
        /* const subscription = await this.stripe.subscriptions.create({
            customer: req.customerId,
            items: [{ price: req.priceId }],
            default_payment_method: setupIntent.payment_method
        }); */
    }
    private mapIntervalToStripeInterval(interval: string) {
        const map = {
            monthly: { interval: 'month', interval_count: 1 },
            quarterly: { interval: 'month', interval_count: 3 },
            yearly: { interval: 'year', interval_count: 1 },
        };
        return map[interval] || { interval: 'month', interval_count: 1 };
    }

    private calculateNextBillingDate(interval: string): number {
        const now = Math.floor(Date.now() / 1000);
        const days = {
            monthly: 30,
            quarterly: 90,
            yearly: 365,
        };
        const daysToAdd = days[interval] || 30;
        return now + (daysToAdd * 24 * 60 * 60);
    }
    private mapIntervalToFrequency(interval: string): string {
        const map = {
            monthly: 'Monthly',
            quarterly: 'Quarterly',
            yearly: 'Yearly',
        };
        return map[interval] || 'One-Time';
    }
    private async processCartItemAfterPayment(params: {
        item: CartItemDto;
        donationId: string;
        contact: any;
        customer: any;
        object: any;
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

        donation.customerStipe = customer.id;

        // Create Stripe price
        const interval = this.mapIntervalToStripeInterval(item.interval);

        const priceCheck = await this.stripe.prices.search({
            query: `product:"prod_TYxTnm0rvxuSWn" AND metadata['price']:'${item.amount}'`,
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
        // Create Stripe subscription with trial to prevent immediate charge
        const subscription = await this.createStripeSubscription({
            customerId: customer.id,
            priceId: price.id,
            trial_end: billingCycleAnchor, // Don't charge until next period
            billing_cycle_anchor: billingCycleAnchor,
            default_payment_method: object.payment_method,
            metadata: {
                donationId: donationId,
                contactId: contact._id.toString(),
                type: item.type,
            },
        }, {});

        this.logger.log(`Created subscription ${subscription.id} for ${item.type}`);

        /* // Create recurring donation record
         const recurringDonation = await this.recurringService.createRecurring({
             donorType: "Contact",
             frequency: donation.frequency || "Monthly",
             customerStipe: stripeCustomer.id,
             amount: donation.Amount || 0,
             DayOfMonth: new Date(billingCycleAnchor * 1000).getDate(),
             donations: new mongoose.Types.ObjectId(donation._id as string),
             sponsorships: sponsorshipId
                 ? new mongoose.Types.ObjectId(sponsorshipId)
                 : null,
             donor: new mongoose.Types.ObjectId(contact._id as string),
             status: "Active",
             stripeSubscriptionId: subscription.id,
             nextBillingDate: new Date(billingCycleAnchor * 1000),
         });
 
         // Link recurring to donation
         donation.Recurring = new mongoose.Types.ObjectId(recurringDonation._id as string);
 
         // Update sponsorship if exists
         if (sponsorshipId) {
             const sponsorship = await this.sponsorshipService.findById(sponsorshipId);
             if (sponsorship) {
                 sponsorship.Status = 'Active';
                 sponsorship.Recurring = new mongoose.Types.ObjectId(recurringDonation._id as string);
                 sponsorship.stripeSubscriptionId = subscription.id;
                 await sponsorship.save();
             }
         }
 
         await donation.save();*/
    }
}
