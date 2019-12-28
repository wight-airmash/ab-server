import { MOB_TYPES } from '@airbattle/protocol';

export const SHIPS_TYPES = {
  PREDATOR: 1,
  GOLIATH: 2,
  COPTER: 3,
  TORNADO: 4,
  PROWLER: 5,
};

export const SHIPS_FIRE_MODES = {
  FIRE: 'fire',
  INFERNO: 'infernoFire',
};

export const SHIPS_FIRE_TYPES = {
  DEFAULT: 'default',
  SPECIAL: 'special',
};

export const SHIPS_ENCLOSE_RADIUS = {
  PREDATOR: 32,
  GOLIATH: 88,
  COPTER: 34,
  TORNADO: 38,
  PROWLER: 36,
};

const missileTemplate = (type: number, x: number, y: number, rot: number, alt = false): object => {
  return {
    type,
    x,
    y,
    rot,
    alt,
  };
};

const missileFireTemplate = (def: any = [], special: any = []): any => {
  return {
    [SHIPS_FIRE_TYPES.DEFAULT]: def,
    [SHIPS_FIRE_TYPES.SPECIAL]: special,
  };
};

export const SHIPS_SPECS = {
  [SHIPS_TYPES.PREDATOR]: {
    name: 'raptor',

    turnFactor: 0.065,
    accelFactor: 0.225,
    brakeFactor: 0.025,
    boostFactor: 1.5,
    infernoFactor: 0.75,

    maxSpeed: 5.5,
    minSpeed: 0.001,
    flagSpeed: 5,

    healthRegen: 0.001,
    energyRegen: 0.008,
    fireEnergy: 0.6,
    specialEnergy: 0,
    specialEnergyRegen: -0.01,
    specialDelay: 0,

    fireDelay: 550, // ms.
    damageFactor: 2,
    energyLight: 0.6,

    collisions: [
      [0, 5, 23],
      [0, -15, 15],
      [0, -25, 12],
    ],

    repelEnergy: 2100,

    [SHIPS_FIRE_MODES.FIRE]: missileFireTemplate([
      missileTemplate(MOB_TYPES.PREDATOR_MISSILE, 0, 35, 0),
    ]),

    [SHIPS_FIRE_MODES.INFERNO]: missileFireTemplate([
      missileTemplate(MOB_TYPES.PREDATOR_MISSILE, -20, 5, -0.05),
      missileTemplate(MOB_TYPES.PREDATOR_MISSILE, 0, 35, 0),
      missileTemplate(MOB_TYPES.PREDATOR_MISSILE, 20, 5, 0.05),
    ]),
  },

  [SHIPS_TYPES.GOLIATH]: {
    name: 'spirit',

    turnFactor: 0.04,
    accelFactor: 0.15,
    brakeFactor: 0.015,
    boostFactor: 1,
    infernoFactor: 0.75,

    maxSpeed: 3.5,
    minSpeed: 0.001,
    flagSpeed: 5,

    healthRegen: 0.0005,
    energyRegen: 0.005,
    fireEnergy: 0.9,
    specialEnergy: 0.5,
    specialEnergyRegen: 0,
    specialDelay: 1000,

    fireDelay: 300, // ms.
    damageFactor: 1,
    energyLight: 0.9,

    collisions: [
      [0, 0, 35],
      [50, 14, 16],
      [74, 26, 14],
      [30, 8, 23],
      [63, 22, 15],
      [-50, 14, 16],
      [-74, 26, 14],
      [-30, 8, 23],
      [-63, 22, 15],
    ],

    repelEnergy: 7500,

    [SHIPS_FIRE_MODES.FIRE]: missileFireTemplate([
      missileTemplate(MOB_TYPES.GOLIATH_MISSILE, 0, 35, 0),
    ]),

    [SHIPS_FIRE_MODES.INFERNO]: missileFireTemplate([
      missileTemplate(MOB_TYPES.GOLIATH_MISSILE, -30, 0, -0.05),
      missileTemplate(MOB_TYPES.GOLIATH_MISSILE, 0, 35, 0),
      missileTemplate(MOB_TYPES.GOLIATH_MISSILE, 30, 0, 0.05),
    ]),
  },

  [SHIPS_TYPES.COPTER]: {
    name: 'mohawk',

    turnFactor: 0.07,
    accelFactor: 0.275,
    brakeFactor: 0.025,
    boostFactor: 1,
    infernoFactor: 0.75,

    maxSpeed: 6,
    minSpeed: 0.001,
    flagSpeed: 5,

    healthRegen: 0.001,
    energyRegen: 0.01,
    fireEnergy: 0.3,
    specialEnergy: 0,
    specialEnergyRegen: 0,
    specialDelay: 0,

    fireDelay: 300,
    damageFactor: 2.78,
    energyLight: 0.3,

    collisions: [
      [0, -12, 15],
      [0, 0, 17],
      [0, 13, 15],
      [0, 26, 15],
    ],

    repelEnergy: 1800,

    [SHIPS_FIRE_MODES.FIRE]: missileFireTemplate([
      missileTemplate(MOB_TYPES.COPTER_MISSILE, 15, 10, 0, true),
    ]),

    [SHIPS_FIRE_MODES.INFERNO]: missileFireTemplate([
      missileTemplate(MOB_TYPES.COPTER_MISSILE, -10, 5, -0.05),
      missileTemplate(MOB_TYPES.COPTER_MISSILE, 0, 10, 0),
      missileTemplate(MOB_TYPES.COPTER_MISSILE, 10, 5, 0.05),
    ]),
  },

  [SHIPS_TYPES.TORNADO]: {
    name: 'tornado',

    turnFactor: 0.055,
    accelFactor: 0.2,
    brakeFactor: 0.025,
    boostFactor: 1,
    infernoFactor: 0.75,

    maxSpeed: 4.5,
    minSpeed: 0.001,
    flagSpeed: 5,

    healthRegen: 0.001,
    energyRegen: 0.006,
    fireEnergy: 0.5,
    specialEnergy: 0.9,
    specialEnergyRegen: 0,
    specialDelay: 0,

    fireDelay: 500,
    damageFactor: 5 / 3,
    energyLight: 0.5,

    collisions: [
      [0, 8, 18],
      [14, 12, 13],
      [-14, 12, 13],
      [0, -12, 16],
      [0, -26, 14],
      [0, -35, 12],
    ],

    repelEnergy: 2400,

    [SHIPS_FIRE_MODES.FIRE]: missileFireTemplate(
      [missileTemplate(MOB_TYPES.TORNADO_MISSILE, 0, 40, 0)],
      [
        missileTemplate(MOB_TYPES.TORNADO_SMALL_MISSILE, -15, 10, -0.05),
        missileTemplate(MOB_TYPES.TORNADO_SMALL_MISSILE, 0, 40, 0),
        missileTemplate(MOB_TYPES.TORNADO_SMALL_MISSILE, 15, 10, 0.05),
      ]
    ),

    [SHIPS_FIRE_MODES.INFERNO]: missileFireTemplate(
      [
        missileTemplate(MOB_TYPES.TORNADO_MISSILE, -15, 10, -0.05),
        missileTemplate(MOB_TYPES.TORNADO_MISSILE, 0, 40, 0),
        missileTemplate(MOB_TYPES.TORNADO_MISSILE, 15, 10, 0.05),
      ],
      [
        missileTemplate(MOB_TYPES.TORNADO_MISSILE, -30, 20, -0.06),
        missileTemplate(MOB_TYPES.TORNADO_MISSILE, -20, 15, -0.03),
        missileTemplate(MOB_TYPES.TORNADO_MISSILE, 0, 40, 0),
        missileTemplate(MOB_TYPES.TORNADO_MISSILE, 20, 15, 0.03),
        missileTemplate(MOB_TYPES.TORNADO_MISSILE, 30, 20, 0.06),
      ]
    ),
  },

  [SHIPS_TYPES.PROWLER]: {
    name: 'prowler',

    turnFactor: 0.055,
    accelFactor: 0.2,
    brakeFactor: 0.025,
    boostFactor: 1,
    infernoFactor: 0.75,

    maxSpeed: 4.5,
    minSpeed: 0.001,
    flagSpeed: 5,

    healthRegen: 0.001,
    energyRegen: 0.006,
    fireEnergy: 0.75,
    specialEnergy: 0.6,
    specialEnergyRegen: 0,
    specialDelay: 1500,

    damageFactor: 5 / 3,
    fireDelay: 300,
    energyLight: 0.75,

    collisions: [
      [0, 11, 25],
      [0, -8, 18],
      [19, 20, 10],
      [-19, 20, 10],
      [0, -20, 14],
    ],

    repelEnergy: 2600,

    [SHIPS_FIRE_MODES.FIRE]: missileFireTemplate([
      missileTemplate(MOB_TYPES.PROWLER_MISSILE, 0, 35, 0),
    ]),

    [SHIPS_FIRE_MODES.INFERNO]: missileFireTemplate([
      missileTemplate(MOB_TYPES.PROWLER_MISSILE, -20, 0, -0.05),
      missileTemplate(MOB_TYPES.PROWLER_MISSILE, 0, 35, 0),
      missileTemplate(MOB_TYPES.PROWLER_MISSILE, 20, 0, 0.05),
    ]),
  },
};
