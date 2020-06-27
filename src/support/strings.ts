import { randomBytes } from 'crypto';

export const generateRandomString = (lengthChars: number): string => {
  return randomBytes(lengthChars / 2).toString('hex');
};

export const generateBackupToken = (): string => {
  return generateRandomString(16);
};

export const escapeHTML = (html: string): string => {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};
