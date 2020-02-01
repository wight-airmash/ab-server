import { randomBytes } from 'crypto';

const generateRandomString = (lengthChars: number): string => {
  return randomBytes(lengthChars / 2).toString('hex');
};

export const generateBackupToken = (): string => {
  return generateRandomString(16);
};
