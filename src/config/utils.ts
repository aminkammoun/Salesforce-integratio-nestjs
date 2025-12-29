export async function authenticateSalesforce() {
    const url = `${process.env.ISTANCEURL}/services/oauth2/token?grant_type=refresh_token&client_id=${process.env.SALESFORCECLIENTID}&client_secret=${process.env.SALESFORCECLIENTSECRET}&refresh_token=${process.env.REFRESH_TOKEN}`;
    console.log('Authenticating with Salesforce at URL:', url);

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        //body: params,
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`Salesforce authentication failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('Salesforce Authentication Response:', data);
    return data.access_token
}
export async function handleInsertQuery(query: string,
    object: string,
    body: any,
    token: string
) {
    //const token = await authenticateSalesforce();
    //console.log('Using Bearer Token:', token);
    console.log(process.env.ISTANCEURL + query + object)
    const res = await fetch(process.env.ISTANCEURL + query + object, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
        body: JSON.stringify(body),
        cache: "no-store",
    });

    try {
        const json = await res.json();
        console.log('Salesforce Insert Response:', json);
        if (object.includes('Opportunity') && json.success) {
            return { message: 'Donation created successfully in Salesforce', salesforceId: json.id };
        }
        if (object.includes('Contact') && json.success) {
            return { message: 'Contact created successfully in Salesforce', salesforceId: json.id };
        }
        if (object.includes('npe03__Recurring_Donation__c') && json.success) {
            return { message: 'Recurring created successfully in Salesforce', salesforceId: json.id };
        }
        if (object.includes('Sponsorship__c') && json.success) {
            return { message: 'Sponsorship created successfully in Salesforce', salesforceId: json.id };
        }
        return json.data;
    } catch (err) {
        console.error(err);
    }
    return null;
}
export async function handleQuery(version: string, query: string, token: string) {
    //const token = await authenticateSalesforce();
    console.log('Using Bearer Token:', token);
    console.log(process.env.ISTANCEURL + version + query)
    const res = await fetch(process.env.ISTANCEURL + version + query, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
        cache: "no-store",
    }
    );
    console.log('Fetch Result:', res);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();


}

export async function fetchAllSalesforceContacts(query: string) {
    try {
        const allRecords: any[] = [];
        const token = await authenticateSalesforce();
        // 1) First query
        let res = await handleQuery('/services/data/v65.0/query/?q=', query, token);

        allRecords.push(...res.records);

        // 2) Fetch next records while there is a next URL
        while (!res.done) {
            console.log('Fetching next batch...');

            res = await handleQuery('', res.nextRecordsUrl, token);
            allRecords.push(...res.records);
        }

        console.log('Total contacts retrieved:', allRecords.length);
        return allRecords;

    } catch (error) {
        console.error(error);
        throw error;
    }
}