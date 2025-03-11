import { FastifyInstance } from "fastify";
import { Collection, Db, ObjectId } from "mongodb";
import { Source } from "../models/source.model";
import { decrypt, encrypt } from "../utils/encryption";

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
}
