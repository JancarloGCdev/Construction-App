import type { BlockWallResult } from "../types";

const BLOCKS_PER_M2 = 12.5;

/**
 * Muro de bloques: ~12.5 unidades/m².
 */
export function calcBlockWall(
  lengthM: number,
  heightM: number
): BlockWallResult {
  const areaM2 = lengthM * heightM;
  const blocksNeeded = Math.ceil(areaM2 * BLOCKS_PER_M2);

  return {
    areaM2,
    blocksNeeded,
  };
}
