import { FastifyInstance } from "fastify";
import { Collection, ObjectId } from "mongodb";
import { Source } from "../models/source.model";
import { decrypt, encrypt } from "../utils/encryption";
import axios from "axios";

export class SourceService {
  private sourceCollection: Collection<Source>;

  constructor(fastify: FastifyInstance) {
    this.sourceCollection = fastify.mongo.db!.collection("sources");
  }

  async createSource(source: Source) {
    const encryptedCredentials = {
      clientEmail: encrypt(source.credentials.clientEmail),
      privateKey: encrypt(source.credentials.privateKey),
      scopes: source.credentials.scopes.map((scope) => encrypt(scope)),
    };

    const secureSource = {
      ...source,
      credentials: encryptedCredentials,
      expired: false,
      lastChecked: new Date(),
    };

    return await this.sourceCollection.insertOne(secureSource);
  }

  async getSources() {
    const sources = await this.sourceCollection.find().toArray();
    return sources.map((source: any) => ({
      ...source,
      credentials: {
        clientEmail: decrypt(source.credentials.clientEmail),
        privateKey: decrypt(source.credentials.privateKey),
        scopes: source.credentials.scopes.map((scope: string) =>
          decrypt(scope)
        ),
      },
    }));
  }

  async getSourceById(id: string) {
    const source = await this.sourceCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!source) return null;

    return {
      ...source,
      credentials: {
        clientEmail: decrypt(source.credentials.clientEmail),
        privateKey: decrypt(source.credentials.privateKey),
        scopes: source.credentials.scopes.map((scope: string) =>
          decrypt(scope)
        ),
      },
    };
  }

  async deleteSource(id: string) {
    return await this.sourceCollection.deleteOne({ id });
  }

  async markSourceAsExpired(sourceId: string) {
    const source = await this.sourceCollection.findOne({
      _id: new ObjectId(sourceId),
    });

    if (!source) return;

    await this.sourceCollection.updateOne(
      { _id: new ObjectId(sourceId) },
      { $set: { expired: true, lastChecked: new Date() } }
    );

    console.log(`🚨 Source ${sourceId} marked as expired.`);

    if (source.callbackUrl) {
      try {
        await axios.post(source.callbackUrl, {
          sourceId,
          expired: true,
          message: "Your Google credentials have expired. Please update them.",
        });
        console.log(`✅ Expiration notification sent to ${source.callbackUrl}`);
      } catch (error) {
        console.error(`❌ Failed to notify ${source.callbackUrl}:`, error);
      }
    }
  }
}
