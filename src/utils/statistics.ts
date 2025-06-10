
import { Package, PlacedPackage, PalletConfig, PackageStats } from '../types/pallet';

export function calculatePackageStats(
  packages: Package[], 
  placedPackages: PlacedPackage[], 
  palletConfig: PalletConfig
): PackageStats {
  // Calculate total packages including duplicates
  const totalPackages = packages.reduce((total, pkg) => total + pkg.duplicateCount, 0);
  const placedCount = placedPackages.length;

  // Calculate volumes
  const totalVolume = packages.reduce((total, pkg) => {
    const packageVolume = pkg.length * pkg.width * pkg.height;
    return total + (packageVolume * pkg.duplicateCount);
  }, 0);

  const usedVolume = placedPackages.reduce((total, pkg) => {
    return total + (pkg.actualLength * pkg.actualWidth * pkg.actualHeight);
  }, 0);

  const palletLoadVolume = palletConfig.length * palletConfig.width * palletConfig.loadHeight;

  // Calculate weights
  const totalWeight = packages.reduce((total, pkg) => total + (pkg.weight * pkg.duplicateCount), 0);
  const usedWeight = placedPackages.reduce((total, pkg) => total + pkg.weight, 0);

  // Calculate utilization percentages
  const volumeUtilization = palletLoadVolume > 0 ? (usedVolume / palletLoadVolume) * 100 : 0;
  const weightUtilization = palletConfig.maxWeight > 0 ? (usedWeight / palletConfig.maxWeight) * 100 : 0;
  const placementEfficiency = totalPackages > 0 ? (placedCount / totalPackages) * 100 : 0;

  return {
    totalPackages,
    placedPackages: placedCount,
    totalVolume,
    usedVolume,
    totalWeight,
    usedWeight,
    volumeUtilization: Math.round(volumeUtilization * 100) / 100,
    weightUtilization: Math.round(weightUtilization * 100) / 100,
    placementEfficiency: Math.round(placementEfficiency * 100) / 100,
  };
}
