import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Source } from "../models/source.model";
import { SourceService } from "../services/source.services";
import { LogFetchService } from "../services/logFetch.service";

export class SourceController {
  private sourceService: SourceService;
  private logFetchService: LogFetchService;

  constructor(fastify: FastifyInstance) {
    this.sourceService = new SourceService(fastify);
    this.logFetchService = new LogFetchService(fastify);
  }

  createSource = async (request: FastifyRequest, reply: FastifyReply) => {
    const source = request.body as Source;
    const result = await this.sourceService.createSource(source);

    console.log("result ", result);

    await this.logFetchService.scheduleLogFetch(result.insertedId);

    return reply.code(201).send({ success: true, id: result.insertedId });
  };

  getSources = async (_: FastifyRequest, reply: FastifyReply) => {
    const sources = await this.sourceService.getSources();
    return reply.send(sources);
  };

  deleteSource = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await this.sourceService.deleteSource(id);
    return reply.send({ success: true });
  };
}
