import { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import healthRoutes from '../routes/healthRoutes';

describe('Health Routes', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(healthRoutes);
    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('should return health status', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    
    const payload = JSON.parse(response.payload);
    expect(payload).toHaveProperty('status', 'ok');
    expect(payload).toHaveProperty('timestamp');
    expect(payload).toHaveProperty('uptime');
    expect(payload).toHaveProperty('version');
    expect(payload).toHaveProperty('environment');
  });
}); 