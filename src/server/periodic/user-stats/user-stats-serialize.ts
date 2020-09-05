import fastJson from 'fast-json-stringify';

export const stringifyUserStats = fastJson({
  type: 'array',
  items: {
    type: 'array',
    items: [
      {
        type: 'string',
      },
      {
        type: 'object',
        properties: {
          id: {
            type: 'object',
            properties: {
              current: {
                type: 'string',
              },
            },
          },
          lifetimestats: {
            type: 'object',
            properties: {
              earnings: {
                type: 'number',
              },
              totalkills: {
                type: 'number',
              },
              totaldeaths: {
                type: 'number',
              },
            },
          },
        },
      },
    ],
  },
});
