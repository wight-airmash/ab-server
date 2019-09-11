import 'module-alias/register';
import config from '@/config';
import Logger from '@/logger';
import GameServer from '@/core/server';

const log = new Logger({
  level: config.logs.level,
  path: config.logs.path,
  isStdout: config.logs.console,
});

log.info(`Initiating ${config.server.type.toUpperCase()} game server named ${config.server.room}.`);

const gameServer = new GameServer({
  config,
  log,
});

(async () => {
  await gameServer.init();

  gameServer.run();
})();
