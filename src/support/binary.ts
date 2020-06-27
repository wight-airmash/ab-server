import { IPv4 } from '../types';

export const decodeIPv4 = (rawIp: ArrayBuffer): IPv4 => {
  return new Uint8Array(rawIp).join('.');
};
