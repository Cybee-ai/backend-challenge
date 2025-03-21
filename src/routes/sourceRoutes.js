const sourceController = require('../controllers/sourceController');

async function routes(fastify, options) {
  fastify.post('/add-source', sourceController.addSource);
  fastify.delete('/remove-source/:id', sourceController.removeSource);
  fastify.get('/sources', sourceController.getSources);
}

module.exports = routes;
