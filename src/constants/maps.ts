/**
 * SpawnChunk = [width, height, x, y, chanceRatio, chanceFactor]
 *
 * x and y are top left coord.
 * chanceRation is shield/inferno spawn chance ratio [0, 1]. 0 - only infernos, 1 - only shields.
 * chanceFactor used to increase or decrease global chance value. Default is 1.
 */

type ChunkWidth = number;
type ChunkHeight = number;
type ChunkX = number;
type ChunkY = number;
type ChunkTypeRatio = number;
type ChanceFactor = number;
type GridCell = [ChunkWidth, ChunkHeight, ChunkX, ChunkY, ChunkTypeRatio, ChanceFactor];

const LARGE_CHUNK = 4096;
const MEDIUM_CHUNK = LARGE_CHUNK / 2;
const SMALL_CHUNK = MEDIUM_CHUNK / 2;
const CHANCE_RATIO = 0.5;
const DEFAULT_CHANCE_FACTOR = 1;

const CTF_BASE_CR = 0.35;
const CTF_BASE_SOUTH_CR = 0.4;
const CTF_BASE_SOUTH_CF = 3;

const spawnCellChunkSize = (cellDepth: number): number => {
  switch (cellDepth) {
    case 0:
      return LARGE_CHUNK;
    case 1:
      return MEDIUM_CHUNK;
    case 2:
      return SMALL_CHUNK;
    default:
      return LARGE_CHUNK;
  }
};

const spawnCellNameToMult = (cellChar: string): number => {
  switch (cellChar) {
    case 'A':
      return -2;
    case 'B':
      return -1;
    case 'C':
      return 0;
    case 'D':
      return 1;
    default:
      return 0;
  }
};

const spawnCellX = (position: string): number => {
  const cellParts = position.split('-');
  let result = 0;

  for (let index = 0; index < cellParts.length; index += 1) {
    const cellName = cellParts[index];
    const offset = index === 0 ? -5 : -1;

    result += (~~cellName.substring(1) + offset) * spawnCellChunkSize(index);
  }

  return result;
};

const spawnCellY = (position: string): number => {
  const cellParts = position.split('-');
  let result = 0;

  for (let index = 0; index < cellParts.length; index += 1) {
    const cellName = cellParts[index];
    const offset = index === 0 ? 0 : 2;

    result += (spawnCellNameToMult(cellName.charAt(0)) + offset) * spawnCellChunkSize(index);
  }

  return result;
};

const powerupSpawnCell = (
  position: string,
  size: number,
  chanceRatio: number,
  chanceFactor = DEFAULT_CHANCE_FACTOR
): GridCell => {
  return [size, size, spawnCellX(position), spawnCellY(position), chanceRatio, chanceFactor];
};

export const MAPS = {
  vanilla: {
    width: 32768,
    height: 16384,
    powerups: {
      periodic: [],

      /**
       * Default powerups grid.
       *
       * Large chunks
       *    1  2  3  4  5  6  7  8
       * A [] [] [] [] [] [] [] []
       * B [] [] [] [] [] [] [] []
       * C [] [] [] [] [] [] [] []
       * D [] [] [] [] [] [] [] []
       */
      defaultGrid: [
        powerupSpawnCell('A1', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('A2', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('A3', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('A4', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('A5', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('A6', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('A7', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('A8', LARGE_CHUNK, CHANCE_RATIO),

        powerupSpawnCell('B1', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('B2', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('B3', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('B4', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('B5', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('B6', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('B7', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('B8', LARGE_CHUNK, CHANCE_RATIO),

        powerupSpawnCell('C1', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('C2', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('C3', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('C4', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('C5', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('C6', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('C7', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('C8', LARGE_CHUNK, CHANCE_RATIO),

        powerupSpawnCell('D1', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('D2', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('D3', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('D4', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('D5', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('D6', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('D7', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('D8', LARGE_CHUNK, CHANCE_RATIO),
      ],

      /**
       * CTF powerups grid.
       * The grid inside and around flag bases has special config.
       *
       * Large chunks
       *    1  2  3  4  5  6  7  8
       * A [] [] [] [] [] [] [] []
       * B []       [] []       []
       * C []       [] []       []
       * D [] [] [] [] [] [] [] []
       *
       *
       *
       * Medium chunks
       *
       * Blue base
       *       1  2           1  2
       * B2-A [] []     B3-A [] []
       * B2-B []        B3-B    []
       *
       *       1  2           1  2
       * C2-A []        C3-A    []
       * C2-B [] []     C3-B [] []
       *
       * Red base
       *       1  2           1  2
       * B6-A [] []     B7-A [] []
       * B6-B []        B7-B    []
       *
       *       1  2           1  2
       * C6-A []        C7-A    []
       * C6-B [] []     C7-B [] []
       *
       *
       *
       * Small chunks
       *
       * Blue base
       *         1  2           1  2
       * B2-B2-A [] []   B3-B1-A [] []
       * B2-B2-B [] []   B3-B1-B [] []
       *
       * B2-B2-A1 and B2-B2-A2 are in-base chunks
       * B2-B2-B1 and B2-B2-B2 are south-enter chunks
       *
       *         1  2           1  2
       * C2-A2-A [] []   C3-A1-A [] []
       * C2-A2-B [] []   C3-A1-B [] []
       *
       * Red base
       *         1  2           1  2
       * B6-B2-A [] []   B7-B1-A [] []
       * B6-B2-B [] []   B7-B1-B [] []
       *
       *         1  2           1  2
       * C6-A2-A [] []   C7-A1-A [] []
       * C6-A2-B [] []   C7-A1-B [] []
       *
       */
      ctfGrid: [
        powerupSpawnCell('A1', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('A2', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('A3', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('A4', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('A5', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('A6', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('A7', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('A8', LARGE_CHUNK, CHANCE_RATIO),

        powerupSpawnCell('B1', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('B2-A1', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B2-A2', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B2-B1', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B2-B2-A1', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B2-B2-A2', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B2-B2-B1', SMALL_CHUNK, CTF_BASE_SOUTH_CR, CTF_BASE_SOUTH_CF),
        powerupSpawnCell('B2-B2-B2', SMALL_CHUNK, CTF_BASE_SOUTH_CR, CTF_BASE_SOUTH_CF),
        powerupSpawnCell('B3-A1', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B3-A2', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B3-B1-A1', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B3-B1-A2', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B3-B1-B1', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B3-B1-B2', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B3-B2', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B4', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('B5', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('B6-A1', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B6-A2', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B6-B1', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B6-B2-A1', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B6-B2-A2', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B6-B2-B1', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B6-B2-B2', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B7-A1', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B7-A2', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B7-B1-A1', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B7-B1-A2', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B7-B1-B1', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B7-B1-B2', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B7-B2', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('B8', LARGE_CHUNK, CHANCE_RATIO),

        powerupSpawnCell('C1', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('C2-A1', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C2-A2-A1', SMALL_CHUNK, CTF_BASE_SOUTH_CR, CTF_BASE_SOUTH_CF),
        powerupSpawnCell('C2-A2-A2', SMALL_CHUNK, CTF_BASE_SOUTH_CR, CTF_BASE_SOUTH_CF),
        powerupSpawnCell('C2-A2-B1', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C2-A2-B2', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C2-B1', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C2-B2', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C3-A1-A1', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C3-A1-A2', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C3-A1-B1', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C3-A1-B2', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C3-A2', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C3-B1', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C3-B2', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C4', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('C5', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('C6-A1', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C6-A2-A1', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C6-A2-A2', SMALL_CHUNK, CTF_BASE_SOUTH_CR, CTF_BASE_SOUTH_CF),
        powerupSpawnCell('C6-A2-B1', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C6-A2-B2', SMALL_CHUNK, CTF_BASE_SOUTH_CR, CTF_BASE_SOUTH_CF),
        powerupSpawnCell('C6-B1', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C6-B2', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C7-A1-A1', SMALL_CHUNK, CTF_BASE_SOUTH_CR, CTF_BASE_SOUTH_CF),
        powerupSpawnCell('C7-A1-A2', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C7-A1-B1', SMALL_CHUNK, CTF_BASE_SOUTH_CR, CTF_BASE_SOUTH_CF),
        powerupSpawnCell('C7-A1-B2', SMALL_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C7-A2', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C7-B1', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C7-B2', MEDIUM_CHUNK, CTF_BASE_CR),
        powerupSpawnCell('C8', LARGE_CHUNK, CHANCE_RATIO),

        powerupSpawnCell('D1', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('D2', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('D3', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('D4', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('D5', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('D6', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('D7', LARGE_CHUNK, CHANCE_RATIO),
        powerupSpawnCell('D8', LARGE_CHUNK, CHANCE_RATIO),
      ],
    },
  },
};
