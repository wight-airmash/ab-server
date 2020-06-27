/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
type CompareFn = (a: any, b: any) => boolean;

export const bInsert = (array: any[], element: any, compare: CompareFn): void => {
  let min = 0;
  let max = array.length;

  while (max - min > 0) {
    const m = ~~((min + max) / 2);

    if (compare(array[m], element)) {
      max = m;
    } else {
      min = m + 1;
    }
  }

  array.splice(max, 0, element);
};
