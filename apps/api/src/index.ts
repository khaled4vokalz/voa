import Fastify from 'fastify';
import cors from '@fastify/cors';
import { recitationRoutes } from './routes/recitation.js';
import { quranRoutes } from './routes/quran.js';

const fastify = Fastify({
  logger: true,
});

// Register plugins
await fastify.register(cors, {
  origin: true,
});

// Register routes
await fastify.register(recitationRoutes, { prefix: '/api/recitation' });
await fastify.register(quranRoutes, { prefix: '/api/quran' });

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
