/**
 *
 * @param min minimum (inclusive)
 * @param max maximum (inclusive)
 */
export const getRandomInt = (min: number, max: number): number => {
  const intMin = Math.ceil(min);

  return Math.floor(Math.random() * (Math.floor(max) - intMin + 1)) + intMin;
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
  if (value > 99999) {
    const m = Math.round((value / 1e6) * 100) / 100;

    return `${m}M`;
  }

  if (value > 999) {
    const k = Math.round((value / 1000) * 10) / 10;

    return `${k}K`;
  }

  return `${value}`;
};
