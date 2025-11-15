export interface ChildToreserve {
    nationality: string;
    Requestedcount: number;
}
export interface SponsorshipChilds {
    donationId: string;
    donorId: string;
    childToreserve: ChildToreserve[];
}