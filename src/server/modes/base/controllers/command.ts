import { ClientPackets } from '@airbattle/protocol';
import {
  COMMAND_DROP_FLAG,
  COMMAND_DROP_UPGRADE,
  COMMAND_ELECTIONS,
  COMMAND_FLAG,
  COMMAND_HORIZON,
  COMMAND_MATCH,
  COMMAND_PROFILE,
  COMMAND_RESPAWN,
  COMMAND_SERVER,
  COMMAND_SPECTATE,
  COMMAND_SPECTATORS,
  COMMAND_SU,
  COMMAND_SWITCH,
  COMMAND_UPGRADE,
  COMMAND_USURP,
  ROUTE_COMMAND,
  COMMAND_ABILITIES,
} from '@/events';
import { System } from '@/server/system';
import { has } from '@/support/objects';
import { MainConnectionId } from '@/types';

interface ServerCommands {
  [commandName: string]: string;
}

export default class CommandMessageHandler extends System {
  /**
   * All available server commands.
   */
  protected commands: ServerCommands;

  constructor({ app }) {
    super({ app });

    this.commands = Object.freeze({
      drop: COMMAND_DROP_FLAG,
      flag: COMMAND_FLAG,
      respawn: COMMAND_RESPAWN,
      spectate: COMMAND_SPECTATE,
      upgrade: COMMAND_UPGRADE,

      // Custom commands.
      profile: COMMAND_PROFILE,
      server: COMMAND_SERVER,
      spectators: COMMAND_SPECTATORS,
      su: COMMAND_SU,
      upgrades: COMMAND_DROP_UPGRADE,
      abilities: COMMAND_ABILITIES,

      // CTF only.
      elections: COMMAND_ELECTIONS,
      match: COMMAND_MATCH,
      usurp: COMMAND_USURP,
      switch: COMMAND_SWITCH,

      // Temporarily added debug commands. These commands will be removed in the future.
      horizon: COMMAND_HORIZON,
    });

    this.listeners = {
      [ROUTE_COMMAND]: this.onMessageReceived,
    };
  }

  /**
   * Handle `Command` request
   *
   * @param connectionId player connection id
   * @param msg player packet
   */
  onMessageReceived(connectionId: MainConnectionId, msg: ClientPackets.Command): void {
    const { com, data } = msg;

    if (has(this.commands, com)) {
      this.emit(this.commands[com], connectionId, data);
    }
  }
}
