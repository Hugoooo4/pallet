import { Package, PlacedPackage, PalletConfig, Position, Rotation, RotationType } from '../types/pallet';

// Tolerance for rounding errors (0.05cm = 0.0005m)
const ROUNDING_TOLERANCE = 0.0005;

// Helper function to check if two numbers are approximately equal
const approxEqual = (a: number, b: number): boolean => {
  return Math.abs(a - b) <= ROUNDING_TOLERANCE;
};

// Helper function to check if a is less than or equal to b (with tolerance)
const approxLessOrEqual = (a: number, b: number): boolean => {
  return a <= b || approxEqual(a, b);
};

interface PackageType {
  dimensions: { length: number; width: number; height: number };
  count: number;
  weight: number;
  rotationType: RotationType;
  packages: Package[];
}

interface LayerPlan {
  packages: PlacedPackage[];
  height: number;
  efficiency: number;
}

export class BinPackingAlgorithm {
  private palletConfig: PalletConfig;
  private placedPackages: PlacedPackage[] = [];
  private availablePositions: Position[] = [];

  constructor(palletConfig: PalletConfig) {
    this.palletConfig = palletConfig;
    this.initializePositions();
  }

  private initializePositions(): void {
    this.availablePositions = [{ x: 0, y: this.palletConfig.baseHeight, z: 0 }];
  }

  public packPackages(packages: Package[]): PlacedPackage[] {
    this.placedPackages = [];
    this.initializePositions();

    const expandedPackages = this.expandPackages(packages);
    
    // Group packages by type for optimized handling
    const packageTypes = this.groupPackagesByType(expandedPackages);
    
    // Try different optimization strategies
    const strategies = [
      () => this.layerBasedPacking(packageTypes),
      () => this.hybridPacking(packageTypes),
      () => this.uniformPackingOptimization(packageTypes),
      () => this.greedyPacking(expandedPackages)
    ];

    let bestResult: PlacedPackage[] = [];
    let bestScore = -1;

    for (const strategy of strategies) {
      const result = strategy();
      const score = this.evaluatePackingQuality(result);
      
      if (score > bestScore) {
        bestScore = score;
        bestResult = result;
      }
    }

    return bestResult;
  }

  private groupPackagesByType(packages: Package[]): PackageType[] {
    const typeMap = new Map<string, PackageType>();

    for (const pkg of packages) {
      const key = `${pkg.length}x${pkg.width}x${pkg.height}x${pkg.weight}x${pkg.rotationType}`;
      
      if (!typeMap.has(key)) {
        typeMap.set(key, {
          dimensions: { length: pkg.length, width: pkg.width, height: pkg.height },
          count: 0,
          weight: pkg.weight,
          rotationType: pkg.rotationType,
          packages: []
        });
      }
      
      const type = typeMap.get(key)!;
      type.count++;
      type.packages.push(pkg);
    }

    return Array.from(typeMap.values()).sort((a, b) => b.count - a.count);
  }

  private layerBasedPacking(packageTypes: PackageType[]): PlacedPackage[] {
    this.placedPackages = [];
    this.initializePositions();

    const layers: LayerPlan[] = [];
    let currentHeight = this.palletConfig.baseHeight;
    const remainingPackages = new Map<string, Package[]>();
    
    // Initialize remaining packages
    for (const type of packageTypes) {
      const key = this.getTypeKey(type);
      remainingPackages.set(key, [...type.packages]);
    }

    while (currentHeight < this.palletConfig.baseHeight + this.palletConfig.loadHeight) {
      const layer = this.createOptimalLayer(remainingPackages, currentHeight);
      
      if (layer.packages.length === 0) break;
      
      layers.push(layer);
      currentHeight += layer.height;
      
      // Remove used packages
      for (const pkg of layer.packages) {
        const typeKey = this.getPackageTypeKey(pkg);
        const remaining = remainingPackages.get(typeKey) || [];
        const index = remaining.findIndex(p => p.id === pkg.id);
        if (index >= 0) {
          remaining.splice(index, 1);
        }
      }
    }

    // Combine all layers
    const result: PlacedPackage[] = [];
    for (const layer of layers) {
      result.push(...layer.packages);
    }

    return result;
  }

  private createOptimalLayer(remainingPackages: Map<string, Package[]>, startHeight: number): LayerPlan {
    const availableHeight = this.palletConfig.baseHeight + this.palletConfig.loadHeight - startHeight;
    const bestPlans: LayerPlan[] = [];

    // Try different layer strategies
    for (const [typeKey, packages] of remainingPackages) {
      if (packages.length === 0) continue;

      const samplePackage = packages[0];
      const rotations = this.generateRotations(samplePackage);

      for (const rotation of rotations) {
        if (rotation.height > availableHeight) continue;

        const plan = this.createUniformLayer(packages, rotation, startHeight);
        if (plan.packages.length > 0) {
          bestPlans.push(plan);
        }
      }
    }

    // Try mixed layer with smaller packages
    const mixedPlan = this.createMixedLayer(remainingPackages, startHeight, availableHeight);
    if (mixedPlan.packages.length > 0) {
      bestPlans.push(mixedPlan);
    }

    // Return best plan
    return bestPlans.reduce((best, current) => 
      current.efficiency > best.efficiency ? current : best,
      { packages: [], height: 0, efficiency: 0 }
    );
  }

  private createUniformLayer(packages: Package[], rotation: Rotation, startHeight: number): LayerPlan {
    const layerPackages: PlacedPackage[] = [];
    const palletLength = this.palletConfig.length;
    const palletWidth = this.palletConfig.width;

    // Calculate how many packages fit in each direction
    const packagesPerRow = Math.floor(palletLength / rotation.length);
    const packagesPerColumn = Math.floor(palletWidth / rotation.width);
    const maxPackagesInLayer = packagesPerRow * packagesPerColumn;

    let currentWeight = this.getCurrentWeight();
    let packageIndex = 0;

    for (let col = 0; col < packagesPerColumn && packageIndex < packages.length; col++) {
      for (let row = 0; row < packagesPerRow && packageIndex < packages.length; row++) {
        const pkg = packages[packageIndex];
        
        if (currentWeight + pkg.weight > this.palletConfig.maxWeight) {
          break;
        }

        const x = row * rotation.length;
        const z = col * rotation.width;
        const position: Position = { x, y: startHeight, z };

        const placedPackage = this.createPlacedPackage(pkg, position, rotation);
        layerPackages.push(placedPackage);
        currentWeight += pkg.weight;
        packageIndex++;
      }
    }

    const efficiency = this.calculateLayerEfficiency(layerPackages, rotation.height);
    return {
      packages: layerPackages,
      height: rotation.height,
      efficiency
    };
  }

  private createMixedLayer(remainingPackages: Map<string, Package[]>, startHeight: number, availableHeight: number): LayerPlan {
    const layerPackages: PlacedPackage[] = [];
    const occupiedSpaces: { x1: number; x2: number; z1: number; z2: number }[] = [];
    
    // Collect all suitable packages for this layer
    const suitablePackages: { pkg: Package; rotation: Rotation; priority: number }[] = [];
    
    for (const [typeKey, packages] of remainingPackages) {
      for (const pkg of packages) {
        const rotations = this.generateRotations(pkg);
        for (const rotation of rotations) {
          if (rotation.height <= availableHeight) {
            const priority = this.calculatePackagePriority(pkg, rotation);
            suitablePackages.push({ pkg, rotation, priority });
          }
        }
      }
    }

    // Sort by priority (higher first)
    suitablePackages.sort((a, b) => b.priority - a.priority);

    let currentWeight = this.getCurrentWeight();
    
    for (const { pkg, rotation } of suitablePackages) {
      if (currentWeight + pkg.weight > this.palletConfig.maxWeight) continue;
      
      const position = this.findBestPositionInLayer(rotation, startHeight, occupiedSpaces);
      if (position) {
        const placedPackage = this.createPlacedPackage(pkg, position, rotation);
        layerPackages.push(placedPackage);
        currentWeight += pkg.weight;
        
        occupiedSpaces.push({
          x1: position.x,
          x2: position.x + rotation.length,
          z1: position.z,
          z2: position.z + rotation.width
        });
      }
    }

    const maxHeight = layerPackages.reduce((max, pkg) => Math.max(max, pkg.actualHeight), 0);
    const efficiency = this.calculateLayerEfficiency(layerPackages, maxHeight);
    
    return {
      packages: layerPackages,
      height: maxHeight,
      efficiency
    };
  }

  private findBestPositionInLayer(rotation: Rotation, layerY: number, occupiedSpaces: { x1: number; x2: number; z1: number; z2: number }[]): Position | null {
    const stepSize = 0.01; // 1cm resolution
    
    for (let z = 0; z <= this.palletConfig.width - rotation.width; z += stepSize) {
      for (let x = 0; x <= this.palletConfig.length - rotation.length; x += stepSize) {
        const position: Position = { x, y: layerY, z };
        
        // Check if this position conflicts with occupied spaces
        const conflicts = occupiedSpaces.some(space => 
          !(x + rotation.length <= space.x1 || x >= space.x2 || 
            z + rotation.width <= space.z1 || z >= space.z2)
        );
        
        if (!conflicts && this.canPlaceAtPosition(rotation, position)) {
          return position;
        }
      }
    }
    
    return null;
  }

  private calculatePackagePriority(pkg: Package, rotation: Rotation): number {
    const volume = rotation.length * rotation.width * rotation.height;
    const density = pkg.weight / volume;
    const baseArea = rotation.length * rotation.width;
    
    // Prioritize: higher density, larger base area, original orientation
    let priority = density * 1000 + baseArea * 100;
    
    // Bonus for original orientation
    if (rotation.length === pkg.length && rotation.width === pkg.width && rotation.height === pkg.height) {
      priority += 50;
    }
    
    return priority;
  }

  private calculateLayerEfficiency(packages: PlacedPackage[], layerHeight: number): number {
    if (packages.length === 0) return 0;
    
    const totalPackageVolume = packages.reduce((sum, pkg) => 
      sum + (pkg.actualLength * pkg.actualWidth * pkg.actualHeight), 0);
    
    const layerVolume = this.palletConfig.length * this.palletConfig.width * layerHeight;
    const volumeEfficiency = totalPackageVolume / layerVolume;
    
    const packageCount = packages.length;
    const maxPossiblePackages = Math.floor(layerVolume / Math.min(...packages.map(p => 
      p.actualLength * p.actualWidth * p.actualHeight)));
    const countEfficiency = packageCount / maxPossiblePackages;
    
    return volumeEfficiency * 0.7 + countEfficiency * 0.3;
  }

  private uniformPackingOptimization(packageTypes: PackageType[]): PlacedPackage[] {
    let bestResult: PlacedPackage[] = [];
    let bestCount = 0;

    // Focus on the most common package types first
    for (const type of packageTypes.slice(0, 3)) { // Top 3 most common types
      const result = this.optimizeForSingleType(type);
      if (result.length > bestCount) {
        bestCount = result.length;
        bestResult = result;
      }
    }

    return bestResult;
  }

  private optimizeForSingleType(type: PackageType): PlacedPackage[] {
    this.placedPackages = [];
    this.initializePositions();

    const rotations = this.generateRotations(type.packages[0]);
    let bestResult: PlacedPackage[] = [];
    let bestCount = 0;

    for (const rotation of rotations) {
      this.placedPackages = [];
      const result = this.packUniformBoxes(type.packages, rotation);
      
      if (result.length > bestCount) {
        bestCount = result.length;
        bestResult = [...result];
      }
    }

    return bestResult;
  }

  private packUniformBoxes(packages: Package[], rotation: Rotation): PlacedPackage[] {
    const result: PlacedPackage[] = [];
    const palletLength = this.palletConfig.length;
    const palletWidth = this.palletConfig.width;
    const palletHeight = this.palletConfig.loadHeight;

    // Calculate optimal arrangement
    const packagesPerRow = Math.floor(palletLength / rotation.length);
    const packagesPerColumn = Math.floor(palletWidth / rotation.width);
    const layersCount = Math.floor(palletHeight / rotation.height);

    const totalCapacity = packagesPerRow * packagesPerColumn * layersCount;
    const packagesToPlace = Math.min(packages.length, totalCapacity);

    let currentWeight = 0;
    let packageIndex = 0;

    for (let layer = 0; layer < layersCount && packageIndex < packagesToPlace; layer++) {
      const y = this.palletConfig.baseHeight + (layer * rotation.height);
      
      for (let col = 0; col < packagesPerColumn && packageIndex < packagesToPlace; col++) {
        for (let row = 0; row < packagesPerRow && packageIndex < packagesToPlace; row++) {
          const pkg = packages[packageIndex];
          
          if (currentWeight + pkg.weight > this.palletConfig.maxWeight) {
            return result;
          }

          const x = row * rotation.length;
          const z = col * rotation.width;
          const position: Position = { x, y, z };

          const placedPackage = this.createPlacedPackage(pkg, position, rotation);
          result.push(placedPackage);
          currentWeight += pkg.weight;
          packageIndex++;
        }
      }
    }

    return result;
  }

  private hybridPacking(packageTypes: PackageType[]): PlacedPackage[] {
    this.placedPackages = [];
    this.initializePositions();

    // Start with the most common package type
    if (packageTypes.length > 0) {
      const primaryType = packageTypes[0];
      const primaryResult = this.optimizeForSingleType(primaryType);
      this.placedPackages = [...primaryResult];
    }

    // Fill remaining space with other packages
    const usedIds = new Set(this.placedPackages.map(p => p.id));
    const remainingPackages: Package[] = [];
    
    for (const type of packageTypes) {
      for (const pkg of type.packages) {
        if (!usedIds.has(pkg.id)) {
          remainingPackages.push(pkg);
        }
      }
    }

    // Use greedy approach for remaining packages
    this.updateAvailablePositionsFromPlaced();
    for (const pkg of remainingPackages) {
      if (this.canAddPackageWeight(pkg.weight)) {
        this.placePackageOptimized(pkg);
      }
    }

    return this.placedPackages;
  }

  private updateAvailablePositionsFromPlaced(): void {
    this.availablePositions = [{ x: 0, y: this.palletConfig.baseHeight, z: 0 }];
    
    for (const pkg of this.placedPackages) {
      this.updateAvailablePositions(pkg);
    }
  }

  private greedyPacking(packages: Package[]): PlacedPackage[] {
    // This is the improved version of the original tryBasicPacking
    this.placedPackages = [];
    this.initializePositions();

    const strategies = [
      // Volume-based (largest first)
      [...packages].sort((a, b) => 
        (b.length * b.width * b.height) - (a.length * a.width * a.height)
      ),
      // Height-based (tallest first)
      [...packages].sort((a, b) => b.height - a.height),
      // Base area (largest base first)
      [...packages].sort((a, b) => 
        (b.length * b.width) - (a.length * a.width)
      ),
      // Weight density
      [...packages].sort((a, b) => {
        const densityA = a.weight / (a.length * a.width * a.height);
        const densityB = b.weight / (b.length * b.width * b.height);
        return densityB - densityA;
      })
    ];

    let bestResult: PlacedPackage[] = [];
    let bestScore = 0;

    for (const sortedPackages of strategies) {
      this.placedPackages = [];
      this.initializePositions();

      for (const pkg of sortedPackages) {
        if (this.canAddPackageWeight(pkg.weight)) {
          this.placePackageOptimized(pkg);
        }
      }

      const score = this.evaluatePackingQuality(this.placedPackages);
      if (score > bestScore) {
        bestScore = score;
        bestResult = [...this.placedPackages];
      }
    }

    return bestResult;
  }

  private evaluatePackingQuality(packages: PlacedPackage[]): number {
    if (packages.length === 0) return 0;

    const totalVolume = packages.reduce((sum, pkg) => 
      sum + (pkg.actualLength * pkg.actualWidth * pkg.actualHeight), 0);
    
    const palletVolume = this.palletConfig.length * this.palletConfig.width * this.palletConfig.loadHeight;
    const volumeUtilization = totalVolume / palletVolume;
    
    const packageCount = packages.length;
    const weightUtilization = this.getCurrentWeight() / this.palletConfig.maxWeight;
    
    // Weighted score: 50% volume, 30% count, 20% weight utilization
    return volumeUtilization * 0.5 + (packageCount / 1000) * 0.3 + weightUtilization * 0.2;
  }

  // Helper methods
  private getTypeKey(type: PackageType): string {
    return `${type.dimensions.length}x${type.dimensions.width}x${type.dimensions.height}x${type.weight}x${type.rotationType}`;
  }

  private getPackageTypeKey(pkg: PlacedPackage): string {
    // Reverse engineer the original package dimensions
    return `${pkg.length}x${pkg.width}x${pkg.height}x${pkg.weight}x${pkg.rotationType}`;
  }

  // Existing methods (improved versions)
  private expandPackages(packages: Package[]): Package[] {
    const expanded: Package[] = [];
    for (const pkg of packages) {
      for (let i = 0; i < pkg.duplicateCount; i++) {
        expanded.push({
          ...pkg,
          id: `${pkg.id}_${i}`,
        });
      }
    }
    return expanded;
  }

  private placePackageOptimized(pkg: Package): boolean {
    const rotations = this.generateRotations(pkg);
    let bestPosition: Position | null = null;
    let bestRotation: Rotation | null = null;
    let bestScore = Infinity;

    for (const rotation of rotations) {
      for (const position of this.availablePositions) {
        if (this.canPlaceAtPosition(rotation, position)) {
          const score = this.evaluatePositionScore(position, rotation);
          if (score < bestScore) {
            bestScore = score;
            bestPosition = position;
            bestRotation = rotation;
          }
        }
      }
    }

    if (bestPosition && bestRotation) {
      const placedPackage = this.createPlacedPackage(pkg, bestPosition, bestRotation);
      this.placedPackages.push(placedPackage);
      this.updateAvailablePositions(placedPackage);
      this.removeUsedPosition(bestPosition);
      return true;
    }

    return false;
  }

  private evaluatePositionScore(position: Position, rotation: Rotation): number {
    // Lower score is better
    const { x, y, z } = position;
    
    // Prefer positions that are lower, towards back-left
    const heightScore = y * 10;
    const positionScore = z * 5 + x * 2;
    
    // Penalize wasted space
    const wastedSpace = this.calculateWastedSpace(position, rotation);
    
    return heightScore + positionScore + wastedSpace;
  }

  private calculateWastedSpace(position: Position, rotation: Rotation): number {
    const { x, y, z } = position;
    const rightSpace = this.palletConfig.length - (x + rotation.length);
    const frontSpace = this.palletConfig.width - (z + rotation.width);
    const topSpace = (this.palletConfig.baseHeight + this.palletConfig.loadHeight) - (y + rotation.height);
    
    return rightSpace + frontSpace + topSpace * 0.5; // Height waste is less critical
  }

  private generateRotations(pkg: Package): Rotation[] {
    const rotations: Rotation[] = [];
    const { length, width, height } = pkg;

    switch (pkg.rotationType) {
      case 'horizontal':
        rotations.push(
          { length, width, height, rotationAngles: [0, 0, 0] },
          { length: width, width: length, height, rotationAngles: [0, Math.PI / 2, 0] }
        );
        break;
      
      case 'vertical':
        rotations.push(
          { length, width, height, rotationAngles: [0, 0, 0] }
        );
        break;
      
      case 'all':
        rotations.push(
          { length, width, height, rotationAngles: [0, 0, 0] },
          { length: width, width: length, height, rotationAngles: [0, Math.PI / 2, 0] },
          { length, width: height, height: width, rotationAngles: [Math.PI / 2, 0, 0] },
          { length: height, width, height: length, rotationAngles: [0, 0, Math.PI / 2] },
          { length: width, width: height, height: length, rotationAngles: [Math.PI / 2, Math.PI / 2, 0] },
          { length: height, width: length, height: width, rotationAngles: [Math.PI / 2, 0, Math.PI / 2] }
        );
        break;
    }

    return rotations;
  }

  private canPlaceAtPosition(rotation: Rotation, position: Position): boolean {
    const { x, y, z } = position;
    const { length, width, height } = rotation;

    // Check pallet boundaries with tolerance
    if (!approxLessOrEqual(x + length, this.palletConfig.length) ||
        !approxLessOrEqual(z + width, this.palletConfig.width) ||
        !approxLessOrEqual(y + height, this.palletConfig.baseHeight + this.palletConfig.loadHeight)) {
      return false;
    }

    // Check collision with existing packages
    for (const placed of this.placedPackages) {
      if (this.checkCollision(
        { x, y, z, length, width, height },
        { 
          x: placed.x, 
          y: placed.y, 
          z: placed.z, 
          length: placed.actualLength, 
          width: placed.actualWidth, 
          height: placed.actualHeight 
        }
      )) {
        return false;
      }
    }

    return true;
  }

  private checkCollision(box1: any, box2: any): boolean {
    return !(
      approxLessOrEqual(box1.x + box1.length, box2.x) ||
      approxLessOrEqual(box2.x + box2.length, box1.x) ||
      approxLessOrEqual(box1.y + box1.height, box2.y) ||
      approxLessOrEqual(box2.y + box2.height, box1.y) ||
      approxLessOrEqual(box1.z + box1.width, box2.z) ||
      approxLessOrEqual(box2.z + box2.width, box1.z)
    );
  }

  private createPlacedPackage(pkg: Package, position: Position, rotation: Rotation): PlacedPackage {
    return {
      ...pkg,
      x: position.x,
      y: position.y,
      z: position.z,
      actualLength: rotation.length,
      actualWidth: rotation.width,
      actualHeight: rotation.height,
      rotation: rotation.rotationAngles,
    };
  }

  private updateAvailablePositions(placedPackage: PlacedPackage): void {
    const newPositions: Position[] = [];

    // Strategic position generation
    const positions = [
      // Adjacent positions
      { x: placedPackage.x + placedPackage.actualLength, y: placedPackage.y, z: placedPackage.z },
      { x: placedPackage.x, y: placedPackage.y, z: placedPackage.z + placedPackage.actualWidth },
      { x: placedPackage.x, y: placedPackage.y + placedPackage.actualHeight, z: placedPackage.z },
      
      // Corner positions
      { x: placedPackage.x + placedPackage.actualLength, y: placedPackage.y + placedPackage.actualHeight, z: placedPackage.z },
      { x: placedPackage.x, y: placedPackage.y + placedPackage.actualHeight, z: placedPackage.z + placedPackage.actualWidth },
      { x: placedPackage.x + placedPackage.actualLength, y: placedPackage.y, z: placedPackage.z + placedPackage.actualWidth },
      { x: placedPackage.x + placedPackage.actualLength, y: placedPackage.y + placedPackage.actualHeight, z: placedPackage.z + placedPackage.actualWidth },
    ];

    for (const pos of positions) {
      if (this.isValidPosition(pos) && !this.positionExists(pos)) {
        newPositions.push(pos);
      }
    }

    this.availablePositions.push(...newPositions);

    // Sort positions by priority (bottom-left-back strategy)
    this.availablePositions.sort((a, b) => {
      if (!approxEqual(a.y, b.y)) return a.y - b.y;
      if (!approxEqual(a.z, b.z)) return a.z - b.z;
      return a.x - b.x;
    });
  }

  private isValidPosition(position: Position): boolean {
    return position.x >= 0 && 
           position.y >= this.palletConfig.baseHeight && 
           position.z >= 0 &&
           approxLessOrEqual(position.x, this.palletConfig.length) &&
           approxLessOrEqual(position.y, this.palletConfig.baseHeight + this.palletConfig.loadHeight) &&
           approxLessOrEqual(position.z, this.palletConfig.width);
  }

  private positionExists(position: Position): boolean {
    return this.availablePositions.some(pos => 
      approxEqual(pos.x, position.x) &&
      approxEqual(pos.y, position.y) &&
      approxEqual(pos.z, position.z)
    );
  }

  private removeUsedPosition(position: Position): void {
    this.availablePositions = this.availablePositions.filter(pos =>
      !(approxEqual(pos.x, position.x) &&
        approxEqual(pos.y, position.y) &&
        approxEqual(pos.z, position.z))
    );
  }

  public getCurrentWeight(): number {
    return this.placedPackages.reduce((total, pkg) => total + pkg.weight, 0);
  }

  public canAddPackageWeight(packageWeight: number): boolean {
    return this.getCurrentWeight() + packageWeight <= this.palletConfig.maxWeight;
  }

  // Additional utility methods
  public getPackingStatistics(): {
    totalVolume: number;
    usedVolume: number;
    volumeUtilization: number;
    totalWeight: number;
    weightUtilization: number;
    packageCount: number;
  } {
    const usedVolume = this.placedPackages.reduce((total, pkg) => {
      return total + (pkg.actualLength * pkg.actualWidth * pkg.actualHeight);
    }, 0);
    
    const totalVolume = this.palletConfig.length * this.palletConfig.width * this.palletConfig.loadHeight;
    const totalWeight = this.getCurrentWeight();
    
    return {
      totalVolume,
      usedVolume,
      volumeUtilization: usedVolume / totalVolume,
      totalWeight,
      weightUtilization: totalWeight / this.palletConfig.maxWeight,
      packageCount: this.placedPackages.length
    };
  }
}
