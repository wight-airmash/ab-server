import { CTF_FLAG_STATE, CTF_TEAMS, ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_GAME_FLAG, CONNECTIONS_SEND_PACKETS } from '../../../../events';
import { System } from '../../../../server/system';
import { Flag, PlayerId } from '../../../../types';

export default class GameFlagBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_GAME_FLAG]: this.onGameFlag,
    };
  }

  /**
   * CTF teams/flags state broadcast.
   *
   * Broadcast on:
   * 1. Player capture or lose the flag.
   * 2. Flag captured.
   * 3. Flag returned.
   * 4. Player connected.
   * 5. Game end.
   * 6. Game start.
   *
   * Broadcast to all players or personally to the player after login.
   *
   * @param flagTeam flag team
   * @param playerId player id
   */
  onGameFlag(flagTeam: CTF_TEAMS, playerId: PlayerId = null): void {
    let flag: Flag = null;

    if (flagTeam === CTF_TEAMS.BLUE) {
      flag = this.storage.mobList.get(this.storage.ctfFlagBlueId) as Flag;
    } else {
      flag = this.storage.mobList.get(this.storage.ctfFlagRedId) as Flag;
    }

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.GAME_FLAG,
        type: flag.owner.current === 0 ? CTF_FLAG_STATE.STATIC : CTF_FLAG_STATE.DYNAMIC,
        flag: flagTeam,
        id: flag.owner.current,
        posX: flag.position.x,
        posY: flag.position.y,
        blueteam: this.storage.gameEntity.match.blue,
        redteam: this.storage.gameEntity.match.red,
      } as ServerPackets.GameFlag,
      playerId === null
        ? [...this.storage.mainConnectionIdList]
        : this.storage.playerMainConnectionList.get(playerId)
    );
  }
}
