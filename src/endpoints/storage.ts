import { ConnectionId, PlayerConnection } from '../types';

class ConnectionsStorage {
  /**
   * All connections (main and backup).
   */
  public connectionList: Map<ConnectionId, PlayerConnection<any>> = new Map();

  /**
   * Online counter.
   */
  public players = 0;

  public bots = 0;

  public spectators = 0;

  /**
   * Used to generate connection identifiers.
   */
  public nextConnectionId = 1;
}

export default ConnectionsStorage;
