import GameServer from '@/core/server';
import { GameStorage } from '@/server/storage';
import { System } from '@/server/system';

export abstract class GameManifest {
  protected app: GameServer;

  protected storage: GameStorage;

  protected systemsToLoad: typeof System[];

  constructor({ app }) {
    this.app = app;
    this.storage = app.storage;
    this.systemsToLoad = [];
  }

  protected set systems(systems: typeof System | typeof System[]) {
    if (Array.isArray(systems)) {
      systems.forEach(s => {
        this.systemsToLoad.push(s);
      });
    } else {
      this.systemsToLoad.push(systems);
    }
  }

  startSystems(): void {
    this.systemsToLoad.forEach(S => {
      this.app.startSystem(new S({ app: this.app }));
    });

    this.systemsToLoad = [];
  }
}
