import { MOB_TYPES } from '@airbattle/protocol';
import { SHIPS_TYPES, SHIPS_FIRE_MODES, SHIPS_FIRE_TYPES } from '@/constants';

export const ABILITIES_TYPES = {
  STUN_MISSILE: 1,
  HEXAGON_FIRE_TEMPLATE: 2,
  STEALH: 3,
  CHARGING_ATTACK: 4,
};

export const ABILITIES_SPECS = {
  [ABILITIES_TYPES.STUN_MISSILE]: {
    name: 'stun_missile',
    forShips: [SHIPS_TYPES.PREDATOR, SHIPS_TYPES.PROWLER],
    cost: 1, // boxes

    // types of abilities
    fire: true,
    special: false,
    specialPersistent: false,

    // fire characteristics
    missileType: MOB_TYPES.STUN_MISSILE,
    replaceFireTemplate: false,

    maxCapacity: 1,
    capacityDrain: 1,
    rechargeTime: 6000, // ms
    abilityDelay: 300, // ms.
    abilityEnergy: 0.7,

    checkLaunchConditions: (player, SPEC, _now) => {
      return player.energy.current >= SPEC.abilityEnergy;
    },
  },
  [ABILITIES_TYPES.HEXAGON_FIRE_TEMPLATE]: {
    name: 'hexagon_fire_template',
    forShips: [SHIPS_TYPES.PREDATOR],
    cost: 1, // boxes

    // types of abilities
    fire: true,
    special: false,
    specialPersistent: false,

    // fire characteristics
    missileType: null,
    replaceFireTemplate: true,

    maxCapacity: 3,
    capacityDrain: 1,
    rechargeTime: 15000, // ms
    abilityDelay: 300, // ms.
    abilityEnergy: 1.0,

    [SHIPS_FIRE_MODES.FIRE]: {
      [SHIPS_FIRE_TYPES.DEFAULT]: [
        { x: 0, y: 35, rot: 0 },
        { x: 0, y: -35, rot: 3.14 },
        { x: -20, y: 5, rot: -1.05 },
        { x: 20, y: 5, rot: 1.05 },
        { x: -20, y: 5, rot: -2.09 },
        { x: 20, y: 5, rot: 2.09 },
      ],
    },
    [SHIPS_FIRE_MODES.INFERNO]: {
      [SHIPS_FIRE_TYPES.DEFAULT]: [
        { x: -20, y: 5, rot: -0.349 },
        { x: 0, y: 35, rot: 0 },
        { x: 20, y: 5, rot: 0.349 },
        { x: -20, y: -5, rot: -2.79 },
        { x: 0, y: -35, rot: 3.14 },
        { x: 20, y: -5, rot: 2.79 },
        { x: -20, y: 5, rot: -0.698 },
        { x: -20, y: 5, rot: -1.05 },
        { x: -20, y: 5, rot: -1.396 },
        { x: 20, y: 5, rot: 1.396 },
        { x: 20, y: 5, rot: 1.05 },
        { x: 20, y: 5, rot: 0.698 },
        { x: -20, y: 5, rot: -1.745 },
        { x: -20, y: 5, rot: -2.09 },
        { x: -20, y: 5, rot: -2.44 },
        { x: 20, y: 5, rot: 1.745 },
        { x: 20, y: 5, rot: 2.09 },
        { x: 20, y: 5, rot: 2.44 },
      ],
    },

    checkLaunchConditions: (player, SPEC, _now) => {
      return player.energy.current >= SPEC.abilityEnergy;
    },
  },
  [ABILITIES_TYPES.STEALH]: {
    name: 'stealh',
    forShips: [SHIPS_TYPES.PREDATOR, SHIPS_TYPES.TORNADO, SHIPS_TYPES.PROWLER],
    cost: 1, // boxes

    // types of abilities
    fire: false,
    special: false,
    specialPersistent: true,

    maxCapacity: 180,
    capacityDrain: 1,
    rechargeTime: 15000, // ms
    abilityDelay: 900, // ms.
    abilityEnergy: 0.4,

    checkLaunchConditions: (player, SPEC, now) => {
      return (
        player.energy.current >= SPEC.abilityEnergy &&
        player.times.lastHit < now - SPEC.abilityDelay
      );
    },

    checkPersistentAbilityConditions: (player, _SPEC, _now) => {
      return !player.planestate.fire;
    },

    onLaunch: (player, _SPEC, _now) => {
      player.planestate.stealthed = true;
      player.delayed.BROADCAST_EVENT_STEALTH = true;

      // TODO
      // if (player.planestate.flagspeed === true) {
      //   this.emit(CTF_PLAYER_DROP_FLAG, player.id.current);
      // }
    },
    onEnd: (player, _SPEC, now) => {
      player.planestate.stealthed = false;
      player.delayed.BROADCAST_EVENT_STEALTH = true;
      player.delayed.BROADCAST_PLAYER_UPDATE = true;
      player.ability.lastUse = now;
    },
    onHit: (player, _projectileId, SPEC, now) => {
      SPEC.onEnd(player, SPEC, now);
      player.ability.enabled = false;
    },
    onRepel: (player, SPEC, now) => {
      SPEC.onEnd(player, SPEC, now);
      player.ability.enabled = false;
    },
  },
  [ABILITIES_TYPES.CHARGING_ATTACK]: {
    name: 'charging_attack',
    forShips: [SHIPS_TYPES.PREDATOR],
    cost: 1, // boxes

    // types of abilities
    fire: true,
    special: false,
    specialPersistent: false,

    // fire characteristics
    chargingFire: true,
    missileType: MOB_TYPES.COPTER_MISSILE,
    replaceFireTemplate: false,

    maxCapacity: 1,
    capacityDrain: 1,
    rechargeTime: 500, // ms
    abilityDelay: 300, // ms.
    abilityEnergy: 0.7,

    checkLaunchConditions: (player, SPEC, _now) => {
      return player.energy.current >= SPEC.abilityEnergy && !player.keystate.ABILITY;
    },
    onLaunch: (player, SPEC, _now) => {
      // 120 ~ 2 seconds
      /* eslint-disable no-param-reassign */
      if (player.ability.chargingFire > 360) SPEC.missileType = MOB_TYPES.GOLIATH_MISSILE;
      else if (player.ability.chargingFire > 240) SPEC.missileType = MOB_TYPES.PROWLER_MISSILE;
      else if (player.ability.chargingFire > 120) SPEC.missileType = MOB_TYPES.PREDATOR_MISSILE;
      else SPEC.missileType = MOB_TYPES.COPTER_MISSILE;
      /* eslint-enable no-param-reassign */

      player.ability.chargingFire = 0;
    },
  },
};

export const ABILITIES_NAMES = Object.keys(ABILITIES_SPECS).reduce((obj, k) => {
  obj[ABILITIES_SPECS[k].name] = k; // eslint-disable-line no-param-reassign

  return obj;
}, {});
