import { ObjectId } from "mongodb";

export interface Source {
  _id?: ObjectId;
  sourceType: "google_workspace";
  credentials: {
    clientEmail: string;
    privateKey: string;
    scopes: string[];
  };
  logFetchInterval: number;
  callbackUrl: string;
  expired?: boolean; // ✅ Track credential expiration
  lastChecked?: Date; // ✅ Track last validation check
}
