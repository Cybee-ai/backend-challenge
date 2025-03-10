import { ObjectId } from "mongodb";

export interface Source {
  _id?: ObjectId;
  id: string;
  sourceType: "google_workspace";
  credentials: {
    clientEmail: string;
    privateKey: string;
    scopes: string[];
  };
  logFetchInterval: number;
  callbackUrl: string;
}
