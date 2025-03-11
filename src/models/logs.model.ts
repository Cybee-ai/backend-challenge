import { Db, ObjectId } from "mongodb";

export interface LogEntry {
  _id?: ObjectId;
  sourceId: string;
  logs: {
    id: string;
    timestamp: string;
    actor: { email: string; ipAddress: string };
    eventType: string;
    details: Record<string, unknown>;
  }[];
  createdAt: Date;
}
