import config from './config';
import GameServerBootstrap from './core/bootstrap';
import Logger from './logger';

const log = new Logger();

log.info(
  'Initiating %s game server named "%s", v%s.',
  config.server.type.toUpperCase(),
  config.server.room,
  config.server.version
);

const gameServer = new GameServerBootstrap({
  config,
  log,
});

(async () => {
  await gameServer.init();

  gameServer.start();
})();
