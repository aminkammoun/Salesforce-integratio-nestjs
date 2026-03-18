import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class DonationCreationListener {
    private readonly logger = new Logger(DonationCreationListener.name);

    constructor() {}

    @OnEvent('donation.created')
    async handleDonationCreated(payload: any) {
        try {
            this.logger.log(`Wzaaaab ${payload._id.toString()}`);
            const url = 'https://zrtext.dev.mwl.org/donation-created/';
            const headers = {
                'Content-Type': 'application/json',
                'x-api-key': '32c8222a-5220-4a70-a9f2-69c24109e7g0',
            };

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.logger.log(`Webhook sent for donation ${payload._id}`);
        } catch (error) {
            this.logger.error('Failed sending donation-created webhook', error);
        }
    }
}