import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { first } from 'rxjs';
import { handleInsertQuery } from 'src/config/utils';
@Injectable()
export class SalesforceService {
    constructor(private configService: ConfigService) { }
    async getAccountBulk() {

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
}
