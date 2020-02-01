export const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
};

export const getRandomNumber = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};
