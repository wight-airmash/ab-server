import Entity from './entity';

export default abstract class Component {
  public key: string;

  public componentWasAttached?: (entity: Entity) => void;

  public componentWillBeDetached?: (entity: Entity) => void;

  constructor() {
    this.key = this.constructor.name.toLocaleLowerCase();
  }
}
