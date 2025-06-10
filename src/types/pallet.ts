
export type RotationType = 'horizontal' | 'vertical' | 'all';

export interface Package {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  color: string;
  rotationType: RotationType;
  duplicateCount: number;
}

export interface PlacedPackage extends Package {
  x: number;
  y: number;
  z: number;
  actualLength: number;
  actualWidth: number;
  actualHeight: number;
  rotation: [number, number, number];
}

export interface PalletConfig {
  length: number;
  width: number;
  baseHeight: number;
  loadHeight: number;
  maxWeight: number;
}

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface PackageStats {
  totalPackages: number;
  placedPackages: number;
  totalVolume: number;
  usedVolume: number;
  totalWeight: number;
  usedWeight: number;
  volumeUtilization: number;
  weightUtilization: number;
  placementEfficiency: number;
}

export interface Rotation {
  length: number;
  width: number;
  height: number;
  rotationAngles: [number, number, number];
}
