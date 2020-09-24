import fastJson from 'fast-json-stringify';

export enum FILE_FORMAT {
  USER_STATS = 'user stats',
  SYNC_STATE = 'sync state',
}

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

const syncDataUpdateSchema = {
  type: 'object',
  properties: {
    meta: {
      type: 'object',
      properties: {
        stateChangeTime: {
          type: 'number',
        },
        lastAckResult: {
          type: 'number',
        },
        sendCount: {
          type: 'number',
        },
      },
    },
    type: {
      type: 'string',
    },
    id: {
      type: 'string',
    },
    data: {
      type: 'string',
    },
    timestamp: {
      type: 'number',
    },
    event: {
      type: 'string',
    },
  },
};

export const stringifySyncState = fastJson({
  type: 'object',
  properties: {
    nextSequenceId: {
      type: 'number',
    },
    thisServerId: {
      type: 'string',
    },
    thisServerEndpoint: {
      type: 'string',
    },
    updatesAwaitingSequenceId: {
      type: 'array',
      items: syncDataUpdateSchema,
    },
    updatesAwaitingSend: {
      type: 'array',
      items: {
        type: 'array',
        items: [
          {
            type: 'number',
          },
          syncDataUpdateSchema,
        ],
      },
    },
    updatesAwaitingAck: {
      type: 'array',
      items: {
        type: 'array',
        items: [
          {
            type: 'number',
          },
          syncDataUpdateSchema,
        ],
      },
    },
    updatesAwaitingResend: {
      type: 'array',
      items: {
        type: 'array',
        items: [
          {
            type: 'number',
          },
          syncDataUpdateSchema,
        ],
      },
    },
  },
});
