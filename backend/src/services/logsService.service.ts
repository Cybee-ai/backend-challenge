import { Collection } from "mongodb";
import { LogEntry } from "../models/logs.model";
import { FastifyInstance } from "fastify";

export class LogService {
  private logsCollection: Collection<LogEntry>;

  constructor(fastify: FastifyInstance) {
    this.logsCollection = fastify.mongo.db!.collection("logs");
  }

  async saveLogs(sourceId: string, logs: LogEntry["logs"]) {
    if (logs.length === 0) return null;

    const logIds = logs.map((log) => log.id);
    const existingLogs = await this.logsCollection
      .find({ "logs.id": { $in: logIds } }, { projection: { "logs.id": 1 } })
      .toArray();

    const existingLogIds = new Set(
      existingLogs.flatMap((entry) => entry.logs.map((log) => log.id))
    );

    const newLogs = logs.filter((log) => !existingLogIds.has(log.id));

    if (newLogs.length === 0) {
      console.log(`⚠️ No new logs to insert for source ${sourceId}.`);
      return null;
    }

    const logEntry: LogEntry = {
      sourceId,
      logs: newLogs,
      createdAt: new Date(),
    };

    const result = await this.logsCollection.insertOne(logEntry);
    console.log(
      `✅ Inserted ${newLogs.length} new logs for source ${sourceId}`
    );
    return { ...logEntry, _id: result.insertedId };
  }

  async getLogsBySource(sourceId: string) {
    return this.logsCollection
      .find({ sourceId })
      .sort({ createdAt: -1 })
      .toArray();
  }
}
