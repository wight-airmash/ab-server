export const has = (object: object, prop: string): boolean => {
  return object !== null && Object.prototype.hasOwnProperty.call(object, prop);
};
