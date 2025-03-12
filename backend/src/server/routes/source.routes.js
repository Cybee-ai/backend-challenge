import { addSource, removeSource, getActiveSources } from "../controllers/source.controller.js";
import { addSourceSchema,deleteSourceSchema,getActiveSourcesSchema } from "../schemas/source.schemas.js";

async function sourceRoutes(app) {
  app.post('/api/add-source', {
    schema: addSourceSchema,
    handler: addSource,
  });

  app.delete('/api/delete-source/:id', {
    schema: deleteSourceSchema,
    handler: removeSource
  });

  app.get('/api/sources', {
    schema: getActiveSourcesSchema,
    handler: getActiveSources
  });
}



export default sourceRoutes;
