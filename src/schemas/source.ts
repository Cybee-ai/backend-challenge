export const createSourceSchema = {
  body: {
    type: "object",
    required: ["credentials"],
    properties: {
      credentials: {
        type: "object",
        required: ["clientEmail", "privateKey", "scopes"],
        properties: {
          clientEmail: { type: "string", format: "email" },
          privateKey: { type: "string" },
          scopes: {
            type: "array",
            items: { type: "string", enum: ["admin.googleapis.com"] },
            minItems: 1,
          },
        },
      },
      logFetchInterval: { type: "integer", default: 300 },
      callbackUrl: { type: "string", format: "uri" },
    },
  },
};

export const deleteSourceSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
};
