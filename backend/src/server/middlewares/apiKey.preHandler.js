export default async function apiKeyPreHandler(request, reply) {

  console.log(request.url)
    const publicRoutes = ['/swagger'];
    if (request.method === 'GET' && publicRoutes.some(route => request.url.startsWith(route))) 
        return;

    const apiKey = request.headers['x-api-key'];

    // you shall not pass
    if (!apiKey || apiKey !== process.env.API_KEY) {
      reply
        .code(401)
        .header('Content-Type', 'application/problem+json')
        .send({
          type: 'https://example.com/probs/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Invalid API Key',
          instance: request.url,
        });
    }
  }
  