import { MOB_TYPES } from '@airbattle/protocol';

export const PROJECTILES_SHAPES = {
  REGULAR: 1,
  FAT: 2,
  SMALL: 3,
};

export const PROJECTILES_COLLISIONS = {
  [PROJECTILES_SHAPES.REGULAR]: [[0, 3, 3], [0, 9, 3], [0, 15, 3]],
  [PROJECTILES_SHAPES.FAT]: [[0, 4, 4], [0, 12, 4], [0, 20, 4]],
  [PROJECTILES_SHAPES.SMALL]: [[0, 2, 2], [0, 6, 2], [0, 10, 2]],
};

export const PROJECTILES_SPECS = {
  [MOB_TYPES.PREDATOR_MISSILE]: {
    maxSpeed: 9,
    baseSpeed: 4.05,

    speedFactor: 0.3,
    infernoSpeedFactor: 1,

    accel: 0.105,

    damage: 0.4,
    infernoDamageFactor: 1,

    distance: 1104,

    shape: PROJECTILES_SHAPES.REGULAR,

    repelEnergy: 197,
  },

  [MOB_TYPES.GOLIATH_MISSILE]: {
    maxSpeed: 6,
    baseSpeed: 2.1,

    speedFactor: 0.3,
    infernoSpeedFactor: 1,

    accel: 0.0375,

    damage: 1.2,
    infernoDamageFactor: 1,

    distance: 1076,

    shape: PROJECTILES_SHAPES.FAT,

    repelEnergy: 260,
  },

  [MOB_TYPES.COPTER_MISSILE]: {
    maxSpeed: 9,
    baseSpeed: 5.7,

    speedFactor: 0.3,
    infernoSpeedFactor: 1,

    accel: 0.14,

    damage: 0.2,
    infernoDamageFactor: 1,

    distance: 1161,

    shape: PROJECTILES_SHAPES.SMALL,

    repelEnergy: 155,
  },

  [MOB_TYPES.TORNADO_MISSILE]: {
    maxSpeed: 7,
    baseSpeed: 3.5,

    speedFactor: 0.3,
    infernoSpeedFactor: 1,

    accel: 0.0875,

    damage: 0.4,
    infernoDamageFactor: 1,

    distance: 997,

    shape: PROJECTILES_SHAPES.REGULAR,

    repelEnergy: 186,
  },

  [MOB_TYPES.TORNADO_SMALL_MISSILE]: {
    maxSpeed: 7,
    baseSpeed: 3.5,

    speedFactor: 0.3,
    infernoSpeedFactor: 1,

    accel: 0.0875,

    damage: 0.3,
    infernoDamageFactor: 1,

    distance: 581,

    shape: PROJECTILES_SHAPES.REGULAR,

    repelEnergy: 145,
  },

  [MOB_TYPES.PROWLER_MISSILE]: {
    maxSpeed: 7,
    baseSpeed: 2.8,

    speedFactor: 0.3,
    infernoSpeedFactor: 1,

    accel: 0.07,

    damage: 0.45,
    infernoDamageFactor: 1,

    distance: 819,

    shape: PROJECTILES_SHAPES.REGULAR,

    repelEnergy: 168,
  },
};
