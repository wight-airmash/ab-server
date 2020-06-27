import { Circle, Polygon } from 'collisions';
import Acceleration from '../server/components/acceleration';
import AliveStatus from '../server/components/alive-status';
import Bot from '../server/components/bot';
import Captures from '../server/components/captures';
import Damage from '../server/components/damage';
import Deaths from '../server/components/deaths';
import Delayed from '../server/components/delayed';
import Despawn from '../server/components/despawn';
import Distance from '../server/components/distance';
import Energy from '../server/components/energy';
import PlayerFlag from '../server/components/flag';
import FlagState from '../server/components/flag-state';
import Match from '../server/components/game/match';
import Health from '../server/components/health';
import HitCircles from '../server/components/hit-circles';
import Hitbox from '../server/components/hitbox';
import Horizon from '../server/components/horizon';
import Inferno from '../server/components/inferno-powerup';
import Ip from '../server/components/ip';
import Keystate from '../server/components/keystate';
import Kills from '../server/components/kills';
import Level from '../server/components/level';
import LifetimeStats from '../server/components/lifetime-stats';
import Id from '../server/components/mob-id';
import MobType from '../server/components/mob-type';
import Owner from '../server/components/owner';
import Ping from '../server/components/ping';
import PlaneState from '../server/components/plane-state';
import PlaneType from '../server/components/plane-type';
import Name from '../server/components/player-name';
import Position from '../server/components/position';
import Recaptures from '../server/components/recaptures';
import RepelState from '../server/components/repel';
import Rotation from '../server/components/rotation';
import Say from '../server/components/say';
import Score from '../server/components/score';
import Shield from '../server/components/shield-powerup';
import Spectate from '../server/components/spectate';
import Stats from '../server/components/stats';
import Su from '../server/components/su';
import Team from '../server/components/team';
import Times from '../server/components/times';
import BackupToken from '../server/components/token';
import Upgrades from '../server/components/upgrades';
import UserComponent from '../server/components/user';
import Velocity from '../server/components/velocity';
import Wins from '../server/components/wins';
import Entity from '../server/entity';

export interface Game extends Entity {
  id?: Id;
  match?: Match;
  times?: Times;
}

export interface Mountain extends Entity {
  hitbox?: Hitbox<Circle>;
  hitcircles?: HitCircles;
  id?: Id;
  position?: Position;
  rotation?: Rotation;
}

export interface Powerup extends Entity {
  despawn?: Despawn;
  hitbox?: Hitbox<Circle>;
  hitcircles?: HitCircles;
  id?: Id;
  mobtype?: MobType;
  position?: Position;
  rotation?: Rotation;
  owner?: Owner;
}

export interface Repel extends Entity {
  hitbox?: Hitbox<Circle>;
  hitcircles?: HitCircles;
  id?: Id;
  position?: Position;
  rotation?: Rotation;
  team?: Team;
}

export interface Projectile extends Entity {
  acceleration?: Acceleration;
  damage?: Damage;
  delayed?: Delayed;
  distance?: Distance;
  hitbox?: Hitbox<Polygon>;
  hitcircles?: HitCircles;
  id?: Id;
  inferno?: Inferno;
  mobtype?: MobType;
  owner?: Owner;
  position?: Position;
  repel?: RepelState;
  rotation?: Rotation;
  team?: Team;
  velocity?: Velocity;
}

export interface Flag extends Entity {
  flagstate?: FlagState;
  hitbox?: Hitbox<Circle>;
  hitcircles?: HitCircles;
  id?: Id;
  owner?: Owner;
  position?: Position;
  rotation?: Rotation;
  team?: Team;
}

export interface FlagZone extends Entity {
  hitbox?: Hitbox<Polygon>;
  id?: Id;
  position?: Position;
  team?: Team;
}

export interface User extends Entity {
  id?: Id;
  lifetimestats?: LifetimeStats;
}

export interface Player extends Entity {
  alivestatus?: AliveStatus;
  bot?: Bot;
  captures?: Captures;
  damage?: Damage;
  deaths?: Deaths;
  delayed?: Delayed;
  energy?: Energy;
  flag?: PlayerFlag;
  health?: Health;
  hitbox?: Hitbox<Polygon>;
  hitcircles?: HitCircles;
  horizon?: Horizon;
  id?: Id;
  inferno?: Inferno;
  ip?: Ip;
  keystate?: Keystate;
  kills?: Kills;
  level?: Level;
  name?: Name;
  ping?: Ping;
  planestate?: PlaneState;
  planetype?: PlaneType;
  position?: Position;
  recaptures?: Recaptures;
  repel?: RepelState;
  rotation?: Rotation;
  say?: Say;
  score?: Score;
  shield?: Shield;
  spectate?: Spectate;
  stats?: Stats;
  su?: Su;
  team?: Team;
  times?: Times;
  token?: BackupToken;
  upgrades?: Upgrades;
  user?: UserComponent;
  velocity?: Velocity;
  wins?: Wins;
}
