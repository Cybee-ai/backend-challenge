export const addSourceSchema = {
  body: {
    type: 'object',
    required: ['id', 'sourceType', 'credentials', 'logFetchInterval', 'callbackUrl'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      sourceType: { type: 'string', enum: ['google_workspace'] },
      credentials: {
        type: 'object',
        required: ['clientEmail', 'privateKey', 'scopes'],
        properties: {
          clientEmail: { type: 'string', format: 'email' },
          privateKey: { type: 'string' },
          scopes: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          }
        }
      },
      logFetchInterval: { type: 'integer', minimum: 60,  },
      callbackUrl: { type: 'string', format: 'uri',  },
    },
  },
  description: 'Creates a new Google SDK Source',
  tags: ['Source'], 
  summary: 'Create new source',
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/problem+json': {
          schema: {
          type: 'object',
          properties: {
            type: { type: 'string', format: 'uri', example: 'https://example.com/probs/invalid-request' },
            title: { type: 'string', example: 'Bad Request' },
            status: { type: 'integer', example: 400 },
            detail: { type: 'string', example: 'Invalid data provided' },
            instance: { type: 'string', example: '/add-source' },
          },
        },
      },
    },
  },
  500: {
    description: 'Internal Server Error',
    content: {
      'application/problem+json': {
        schema: {
          type: 'object',
          properties: {
            type: { type: 'string', format: 'uri', example: 'https://example.com/probs/internal-server-error' },
            title: { type: 'string', example: 'Internal Server Error' },
            status: { type: 'integer', example: 500 },
            detail: { type: 'string', example: 'Something went wrong on the server' },
            instance: { type: 'string', example: '/add-source' },
          },
        },
      },
    },
  },
},
}

export const deleteSourceSchema = {
  description: 'Deletes a source SDK',
  tags: ['Source'], 
  summary: 'Delete a source',
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid'},
    },
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/problem+json': {
          schema: {
            type: 'object',
            properties: {
              type: { type: 'string', format: 'uri', example: 'https://example.com/probs/invalid-request' },
              title: { type: 'string', example: 'Bad Request' },
              status: { type: 'integer', example: 400 },
              detail: { type: 'string', example: 'Invalid ID format' },
              instance: { type: 'string', example: '/delete-source/{id}' },
            },
          },
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/problem+json': {
          schema: {
            type: 'object',
            properties: {
              type: { type: 'string', format: 'uri', example: 'https://example.com/probs/internal-server-error' },
              title: { type: 'string', example: 'Internal Server Error' },
              status: { type: 'integer', example: 500 },
              detail: { type: 'string', example: 'Something went wrong on the server' },
              instance: { type: 'string', example: '/delete-source/{id}' },
            },
          },
        },
      },
    },
  },
};



export const getActiveSourcesSchema = {
  description: 'Retrieves active sources. Credentials are hidden for security reasons',
  tags: ['Source'], 
  summary: 'Retrieve active sources',
  response: {
    200: {
      description: 'Successful response',
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true
      },
    },
    
    400: {
      description: 'Bad Request',
      content: {
        'application/problem+json': {
          schema: {
            type: 'object',
            properties: {
              type: { type: 'string', format: 'uri', example: 'https://example.com/probs/invalid-request' },
              title: { type: 'string', example: 'Bad Request' },
              status: { type: 'integer', example: 400 },
              detail: { type: 'string', example: 'Invalid data provided' },
              instance: { type: 'string', example: '/add-source' },
            },
          },
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/problem+json': {
          schema: {
            type: 'object',
            properties: {
              type: { type: 'string', format: 'uri', example: 'https://example.com/probs/internal-server-error' },
              title: { type: 'string', example: 'Internal Server Error' },
              status: { type: 'integer', example: 500 },
              detail: { type: 'string', example: 'Something went wrong on the server' },
              instance: { type: 'string', example: '/add-source' },
            },
          },
        },
      },
    },
  },
}