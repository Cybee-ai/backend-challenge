import { FastifyInstance } from "fastify";
import { Source } from "../models/source.model";
import { decrypt, encrypt } from "../utils/encryption";

export class SourceService {
  private db: any;

  constructor(fastify: FastifyInstance) {
    this.db = fastify.mongo.db?.collection("sources");
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

    return await this.db.insertOne(secureSource);
  }

  async getSources() {
    const sources = await this.db.find().toArray();
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
    const source = await this.db.findOne({ id });
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
    return await this.db.deleteOne({ id });
  }
}
