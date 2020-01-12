import { MOB_TYPES } from '@airbattle/protocol';
import { MissileTemplate, FireTemplate } from '@/types';

export const SHIPS_TYPES = {
  PREDATOR: 1,
  GOLIATH: 2,
  COPTER: 3,
  TORNADO: 4,
  PROWLER: 5,
};

export const SHIPS_NAMES = {
  1: 'Predator',
  2: 'Goliath',
  3: 'Mohawk',
  4: 'Tornado',
  5: 'Prowler',
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
  [SHIPS_TYPES.PREDATOR]: 32,
  [SHIPS_TYPES.GOLIATH]: 88,
  [SHIPS_TYPES.COPTER]: 34,
  [SHIPS_TYPES.TORNADO]: 38,
  [SHIPS_TYPES.PROWLER]: 36,
};

/**
 *
 * @param x missile start X coord relative to the player position
 * @param y missile start Y coord relative to the player position
 * @param rot missile start rotation angle relative to the player position
 * @param alt has or not alternative symmetrical starting place (like copter left/right fires)
 */
const missileTemplate = (x: number, y: number, rot: number, alt = false): MissileTemplate => {
  return {
    x,
    y,
    rot,
    alt,
  };
};

/**
 *
 * @param def default fire template using fire key
 * @param special fire template using special key
 */
const missileFireTemplate = (
  def: MissileTemplate[] = [],
  special: MissileTemplate[] = []
): FireTemplate => {
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

    missileType: MOB_TYPES.PREDATOR_MISSILE,

    [SHIPS_FIRE_MODES.FIRE]: missileFireTemplate([missileTemplate(0, 35, 0)]),

    [SHIPS_FIRE_MODES.INFERNO]: missileFireTemplate([
      missileTemplate(-20, 5, -0.05),
      missileTemplate(0, 35, 0),
      missileTemplate(20, 5, 0.05),
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

    missileType: MOB_TYPES.GOLIATH_MISSILE,

    [SHIPS_FIRE_MODES.FIRE]: missileFireTemplate([missileTemplate(0, 35, 0)]),

    [SHIPS_FIRE_MODES.INFERNO]: missileFireTemplate([
      missileTemplate(-30, 0, -0.05),
      missileTemplate(0, 35, 0),
      missileTemplate(30, 0, 0.05),
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

    missileType: MOB_TYPES.COPTER_MISSILE,

    [SHIPS_FIRE_MODES.FIRE]: missileFireTemplate([missileTemplate(15, 10, 0, true)]),

    [SHIPS_FIRE_MODES.INFERNO]: missileFireTemplate([
      missileTemplate(-10, 5, -0.05),
      missileTemplate(0, 10, 0),
      missileTemplate(10, 5, 0.05),
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

    missileType: MOB_TYPES.TORNADO_MISSILE,
    // TODO for SHIPS_FIRE_MODES.INFERNO special missile type should be MOB_TYPES.TORNADO_MISSILE
    specialMissileType: MOB_TYPES.TORNADO_SMALL_MISSILE,

    [SHIPS_FIRE_MODES.FIRE]: missileFireTemplate(
      [missileTemplate(0, 40, 0)],
      [missileTemplate(-15, 10, -0.05), missileTemplate(0, 40, 0), missileTemplate(15, 10, 0.05)]
    ),

    [SHIPS_FIRE_MODES.INFERNO]: missileFireTemplate(
      [missileTemplate(-15, 10, -0.05), missileTemplate(0, 40, 0), missileTemplate(15, 10, 0.05)],
      [
        missileTemplate(-30, 20, -0.06),
        missileTemplate(-20, 15, -0.03),
        missileTemplate(0, 40, 0),
        missileTemplate(20, 15, 0.03),
        missileTemplate(30, 20, 0.06),
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

    missileType: MOB_TYPES.PROWLER_MISSILE,

    [SHIPS_FIRE_MODES.FIRE]: missileFireTemplate([missileTemplate(0, 35, 0)]),

    [SHIPS_FIRE_MODES.INFERNO]: missileFireTemplate([
      missileTemplate(-20, 0, -0.05),
      missileTemplate(0, 35, 0),
      missileTemplate(20, 0, 0.05),
    ]),
  },
};
