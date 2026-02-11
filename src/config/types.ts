export interface ChildToreserve {
    nationality: string;
    Requestedcount: number;
}
export interface SponsorshipChilds {
    donationId: string;
    donorId: string;
    childToreserve: ChildToreserve[];
    frequency: string;
    Amount: number,
    donor__c: string,
    child?: string[];
}
export interface childAttachment {
    Child__c: string;
    Name: string;
    Type__c: string;
    Youtube_Link__c: string;
    File_URL__c: string;
}