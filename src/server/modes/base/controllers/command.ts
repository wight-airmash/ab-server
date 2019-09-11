import { ClientPackets } from '@airbattle/protocol';
import {
  COMMAND_DROP_FLAG,
  COMMAND_DROP_UPGRADE,
  COMMAND_FLAG,
  COMMAND_MATCH,
  COMMAND_RESPAWN,
  COMMAND_SERVER,
  COMMAND_SPECTATE,
  COMMAND_SU,
  COMMAND_SWITCH,
  COMMAND_UPGRADE,
  ROUTE_COMMAND,
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
      respawn: COMMAND_RESPAWN,
      spectate: COMMAND_SPECTATE,
      upgrade: COMMAND_UPGRADE,
      flag: COMMAND_FLAG,
      drop: COMMAND_DROP_FLAG,

      // Custom commands.
      upgrades: COMMAND_DROP_UPGRADE,
      server: COMMAND_SERVER,
      su: COMMAND_SU,

      // CTF only.
      switch: COMMAND_SWITCH,
      match: COMMAND_MATCH,
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
