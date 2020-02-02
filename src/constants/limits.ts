/**
 * Limit = max "weight sum of type of packets" per tick per connection.
 *
 * Counters increase by weight with each request
 * and decrease with every tick or second.
 */

/**
 * Decreasing every second.
 * The punishment is kick. Repeat kick — ban.
 * Set PACKETS_FLOODING_AUTOBAN=false to disable auto ban.
 */
export const LIMITS_ANY = 140;

export const LIMITS_ANY_WEIGHT = 1;

export const LIMITS_ANY_DECREASE_WEIGHT = 35;

/**
 * Decreasing every second.
 * The punishment is kick. Repeat kick — ban.
 * Set PACKETS_FLOODING_AUTOBAN=false to disable auto ban.
 */
export const LIMITS_KEY = 100;

export const LIMITS_KEY_WEIGHT = 1;

export const LIMITS_KEY_DECREASE_WEIGHT = 20;

/**
 * Decreasing every second.
 * The punishment is mute.
 */
export const LIMITS_CHAT = 1;

export const LIMITS_CHAT_WEIGHT = 1;

export const LIMITS_CHAT_DECREASE_WEIGHT = 1;

export const LIMITS_CHAT_SPAM_ATTEMPTS_TO_MUTE = 2;

/**
 * Decreasing every second.
 * No punishment, only skip.
 */
export const LIMITS_RESPAWN = 3;

export const LIMITS_RESPAWN_DECREASE_WEIGHT = 5;

export const LIMITS_RESPAWN_WEIGHT = 1;

/**
 * Decreasing every second.
 * No punishment, only skip.
 */
export const LIMITS_SPECTATE = 3;

export const LIMITS_SPECTATE_DECREASE_WEIGHT = 10;

export const LIMITS_SPECTATE_WEIGHT = 1;

/**
 * Decreasing every second.
 * No punishment, only skip.
 */
export const LIMITS_SU = 1;

export const LIMITS_SU_DECREASE_WEIGHT = 1;

export const LIMITS_SU_WEIGHT = 5;

/**
 * Decreasing every second.
 * No punishment, only skip.
 */
export const LIMITS_DEBUG = 1;

export const LIMITS_DEBUG_DECREASE_WEIGHT = 1;

export const LIMITS_DEBUG_WEIGHT = 10;
