export const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
};

export const getRandomNumber = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const convertEarningsToLevel = (earnings: number): number => {
  return Math.floor(0.0111 * earnings ** 0.5) + 1;
};

/**
 * Find the dataset median.
 * Not an effective way.
 *
 * 32-bit result.
 *
 * @param dataset
 */
export const median = (dataset: number[]): number => {
  const num = dataset.length;

  if (num === 0) {
    return 0;
  }

  if (num === 1) {
    return dataset[0];
  }

  if (num === 2) {
    return ~~((dataset[0] + dataset[1]) / 2);
  }

  const sortedSet = [...dataset].sort((a, b) => a - b);
  const middleIndex = Math.floor(num / 2);

  if (num % 2 === 1) {
    return sortedSet[middleIndex];
  }

  return ~~((sortedSet[middleIndex - 1] + sortedSet[middleIndex]) / 2);
};

export const numberToHumanReadable = (value: number): string => {
  const l1000 = value % 1000;
  const hds = (value - l1000) / 1000;

  if (hds === 0) {
    return `${value}`;
  }

  return `${hds}K`;
};
