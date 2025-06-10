import { Package, PlacedPackage, PalletConfig, Position, Rotation, RotationType } from '../types/pallet';

// Tolerance for rounding errors (0.5cm = 0.005m)
const ROUNDING_TOLERANCE = 0.005;

// Helper function to check if two numbers are approximately equal
const approxEqual = (a: number, b: number): boolean => {
  return Math.abs(a - b) <= ROUNDING_TOLERANCE;
};

// Helper function to check if a is less than or equal to b (with tolerance)
const approxLessOrEqual = (a: number, b: number): boolean => {
  return a <= b || approxEqual(a, b);
};

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
    
    // Calculate current volume utilization
    const currentResult = this.tryBasicPacking([...expandedPackages]);
    const volumeUtilization = this.calculateVolumeUtilization(currentResult);
    
    // If volume utilization is less than 100%, try comprehensive layer optimization
    if (volumeUtilization < 1.0) {
      const optimizedResult = this.tryLayerOptimization(expandedPackages);
      if (optimizedResult.length > currentResult.length) {
        return optimizedResult;
      }
    }

    return currentResult;
  }

  private calculateVolumeUtilization(placedPackages: PlacedPackage[]): number {
    const usedVolume = placedPackages.reduce((total, pkg) => {
      return total + (pkg.actualLength * pkg.actualWidth * pkg.actualHeight);
    }, 0);
    const palletLoadVolume = this.palletConfig.length * this.palletConfig.width * this.palletConfig.loadHeight;
    return usedVolume / palletLoadVolume;
  }

  private tryLayerOptimization(packages: Package[]): PlacedPackage[] {
    let bestResult: PlacedPackage[] = [];
    let bestCount = 0;

    // Group packages by similar dimensions for layer optimization
    const packageGroups = this.groupSimilarPackages(packages);
    
    // Try different combinations for the first two layers
    for (const group1 of packageGroups) {
      for (const group2 of packageGroups) {
        const result = this.tryTwoLayerCombination(group1, group2, packages);
        if (result.length > bestCount) {
          bestCount = result.length;
          bestResult = [...result];
        }
      }
    }

    return bestResult.length > 0 ? bestResult : this.tryBasicPacking(packages);
  }

  private groupSimilarPackages(packages: Package[]): Package[][] {
    const groups: Package[][] = [];
    const used = new Set<string>();

    for (const pkg of packages) {
      if (used.has(pkg.id)) continue;
      
      const group = [pkg];
      used.add(pkg.id);
      
      // Find similar packages (within 10% size difference)
      for (const other of packages) {
        if (used.has(other.id)) continue;
        
        const sizeDiff = Math.abs((pkg.length * pkg.width * pkg.height) - (other.length * other.width * other.height)) / 
                        (pkg.length * pkg.width * pkg.height);
        
        if (sizeDiff <= 0.1) {
          group.push(other);
          used.add(other.id);
        }
      }
      
      groups.push(group);
    }

    return groups;
  }

  private tryTwoLayerCombination(layer1Packages: Package[], layer2Packages: Package[], allPackages: Package[]): PlacedPackage[] {
    this.placedPackages = [];
    this.initializePositions();

    // Fill first layer with priority orientations
    this.fillLayerWithPriority(layer1Packages, this.palletConfig.baseHeight);
    
    // Get height of first layer
    const firstLayerHeight = this.getMaxHeight();
    
    // Fill second layer if there's space
    if (firstLayerHeight < this.palletConfig.baseHeight + this.palletConfig.loadHeight) {
      this.fillLayerWithPriority(layer2Packages, firstLayerHeight);
    }

    // Fill remaining space with remaining packages
    const usedIds = new Set(this.placedPackages.map(p => p.id));
    const remainingPackages = allPackages.filter(p => !usedIds.has(p.id));
    
    for (const pkg of remainingPackages) {
      if (this.canAddPackageWeight(pkg.weight)) {
        this.placePackageOptimized(pkg);
      }
    }

    return [...this.placedPackages];
  }

  private fillLayerWithPriority(packages: Package[], startHeight: number): void {
    // Priority 1: Original orientation
    for (const pkg of packages) {
      if (this.canAddPackageWeight(pkg.weight)) {
        const originalRotation: Rotation = {
          length: pkg.length,
          width: pkg.width,
          height: pkg.height,
          rotationAngles: [0, 0, 0]
        };
        
        const position = this.findBestPositionForRotation(originalRotation, startHeight);
        if (position) {
          const placedPackage = this.createPlacedPackage(pkg, position, originalRotation);
          this.placedPackages.push(placedPackage);
          this.updateAvailablePositions(placedPackage);
          this.removeUsedPosition(position);
        }
      }
    }

    // Priority 2: Both horizontal orientations (if allowed)
    const remainingPackages = packages.filter(pkg => 
      !this.placedPackages.some(p => p.id === pkg.id) && pkg.rotationType !== 'vertical'
    );

    for (const pkg of remainingPackages) {
      if (this.canAddPackageWeight(pkg.weight)) {
        // Test first horizontal rotation (90 degrees)
        const horizontalRotation1: Rotation = {
          length: pkg.width,
          width: pkg.length,
          height: pkg.height,
          rotationAngles: [0, Math.PI / 2, 0]
        };
        
        const position1 = this.findBestPositionForRotation(horizontalRotation1, startHeight);
        if (position1) {
          const placedPackage = this.createPlacedPackage(pkg, position1, horizontalRotation1);
          this.placedPackages.push(placedPackage);
          this.updateAvailablePositions(placedPackage);
          this.removeUsedPosition(position1);
          continue; // Move to next package
        }

        // Test second horizontal rotation (original orientation again if first failed)
        const horizontalRotation2: Rotation = {
          length: pkg.length,
          width: pkg.width,
          height: pkg.height,
          rotationAngles: [0, 0, 0]
        };
        
        const position2 = this.findBestPositionForRotation(horizontalRotation2, startHeight);
        if (position2) {
          const placedPackage = this.createPlacedPackage(pkg, position2, horizontalRotation2);
          this.placedPackages.push(placedPackage);
          this.updateAvailablePositions(placedPackage);
          this.removeUsedPosition(position2);
        }
      }
    }

    // Priority 3: All rotations (if allowed)
    const stillRemainingPackages = packages.filter(pkg => 
      !this.placedPackages.some(p => p.id === pkg.id) && pkg.rotationType === 'all'
    );

    for (const pkg of stillRemainingPackages) {
      if (this.canAddPackageWeight(pkg.weight)) {
        this.placePackageOptimized(pkg);
      }
    }
  }

  private findBestPositionForRotation(rotation: Rotation, minHeight: number): Position | null {
    let bestPosition: Position | null = null;
    let lowestScore = Infinity;

    for (const position of this.availablePositions) {
      if (position.y >= minHeight && this.canPlaceAtPosition(rotation, position)) {
        const score = this.evaluateSpaceEfficiency(position, rotation);
        if (score < lowestScore) {
          lowestScore = score;
          bestPosition = position;
        }
      }
    }

    return bestPosition;
  }

  private getMaxHeight(): number {
    if (this.placedPackages.length === 0) {
      return this.palletConfig.baseHeight;
    }
    return Math.max(...this.placedPackages.map(pkg => pkg.y + pkg.actualHeight));
  }

  private tryBasicPacking(packages: Package[]): PlacedPackage[] {
    this.placedPackages = [];
    this.initializePositions();

    // Try multiple sorting strategies for better optimization
    const strategies = [
      // Strategy 1: Volume-based (largest first)
      [...packages].sort((a, b) => 
        (b.length * b.width * b.height) - (a.length * a.width * a.height)
      ),
      // Strategy 2: Height-based (tallest first)
      [...packages].sort((a, b) => b.height - a.height),
      // Strategy 3: Weight-based (heaviest first)
      [...packages].sort((a, b) => b.weight - a.weight),
      // Strategy 4: Area-based (largest base area first)
      [...packages].sort((a, b) => 
        (b.length * b.width) - (a.length * a.width)
      ),
      // Strategy 5: Volume density-based (highest density first)
      [...packages].sort((a, b) => 
        (b.weight / (b.length * b.width * b.height)) -
        (a.weight / (a.length * a.width * a.height))
      ),
    ];

    let bestResult: PlacedPackage[] = [];
    let bestCount = 0;

    // Try each strategy and keep the best result
    for (const sortedPackages of strategies) {
      this.placedPackages = [];
      this.initializePositions();

      for (const pkg of sortedPackages) {
        if (this.canAddPackageWeight(pkg.weight)) {
          this.placePackageOptimized(pkg);
        }
      }

      if (this.placedPackages.length > bestCount) {
        bestCount = this.placedPackages.length;
        bestResult = [...this.placedPackages];
      }
    }

    return bestResult;
  }

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
          const volumeUtilization = this.evaluateSpaceEfficiency(position, rotation);
          if (volumeUtilization < bestScore) {
            bestScore = volumeUtilization;
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

  private evaluateSpaceEfficiency(position: Position, rotation: Rotation): number {
    const { x, y, z } = position;
    const emptyAbove = this.palletConfig.baseHeight + this.palletConfig.loadHeight - (y + rotation.height);
    const emptyRight = this.palletConfig.length - (x + rotation.length);
    const emptyFront = this.palletConfig.width - (z + rotation.width);
    return emptyAbove + emptyRight + emptyFront; // smaller sum = better fit
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
    // Use tolerance for collision detection
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

    // Generate positions more densely for better packing
    const stepSize = 0.01; // 1cm steps
    
    // Right of the package
    newPositions.push({
      x: placedPackage.x + placedPackage.actualLength,
      y: placedPackage.y,
      z: placedPackage.z,
    });

    // In front of the package
    newPositions.push({
      x: placedPackage.x,
      y: placedPackage.y,
      z: placedPackage.z + placedPackage.actualWidth,
    });

    // Above the package
    newPositions.push({
      x: placedPackage.x,
      y: placedPackage.y + placedPackage.actualHeight,
      z: placedPackage.z,
    });

    // Add corner positions for better space utilization
    newPositions.push({
      x: placedPackage.x + placedPackage.actualLength,
      y: placedPackage.y + placedPackage.actualHeight,
      z: placedPackage.z,
    });

    newPositions.push({
      x: placedPackage.x,
      y: placedPackage.y + placedPackage.actualHeight,
      z: placedPackage.z + placedPackage.actualWidth,
    });

    newPositions.push({
      x: placedPackage.x + placedPackage.actualLength,
      y: placedPackage.y,
      z: placedPackage.z + placedPackage.actualWidth,
    });

    // Corner-edge strategy position
    newPositions.push({
      x: placedPackage.x + placedPackage.actualLength,
      y: placedPackage.y + placedPackage.actualHeight,
      z: placedPackage.z + placedPackage.actualWidth,
    });

    // Add valid new positions
    for (const pos of newPositions) {
      if (this.isValidPosition(pos) && !this.positionExists(pos)) {
        this.availablePositions.push(pos);
      }
    }

    // Sort positions by priority (bottom-left-front strategy)
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
}
