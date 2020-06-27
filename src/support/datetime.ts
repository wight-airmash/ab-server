import { HOURS_PER_DAY, MINUTES_PER_HOUR, MS_PER_SEC, SECONDS_PER_MINUTE } from '../constants';

export const msToHumanReadable = (ms: number): string => {
  const humanTimeParts = [];
  const time = ms > 0 ? ms : 0;

  const seconds = Math.floor((time / MS_PER_SEC) % SECONDS_PER_MINUTE);
  const minutes = Math.floor((time / (MS_PER_SEC * SECONDS_PER_MINUTE)) % MINUTES_PER_HOUR);
  const hours = Math.floor(
    (time / (MS_PER_SEC * SECONDS_PER_MINUTE * MINUTES_PER_HOUR)) % HOURS_PER_DAY
  );
  const days = Math.floor(
    (time / (MS_PER_SEC * SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY)) % HOURS_PER_DAY
  );

  if (days > 0) {
    humanTimeParts.push(`${days}d`);
  }

  if (hours > 0) {
    humanTimeParts.push(`${hours}h`);
  }

  if (minutes > 0) {
    humanTimeParts.push(`${minutes}m`);
  }

  if (seconds > 0) {
    humanTimeParts.push(`${seconds}s`);
  }

  if (humanTimeParts.length === 0) {
    return '0s';
  }

  return humanTimeParts.join(' ');
};

export const unixMsToHumanReadable = (time: number, now: number = Date.now()): string => {
  return msToHumanReadable(now - time);
};
