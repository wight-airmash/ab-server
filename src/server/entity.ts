import Component from './component';

export default class Entity {
  [x: string]: any;

  /**
   * Attach component(s) with all its properties.
   *
   * @param components
   */
  attach(...components: Component[]): Entity {
    for (let index = 0; index < components.length; index += 1) {
      const component = components[index];

      this[component.key] = component;

      if (typeof component.componentWasAttached === 'function') {
        component.componentWasAttached(this);
      }
    }

    return this;
  }
}
