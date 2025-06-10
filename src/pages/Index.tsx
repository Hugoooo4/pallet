
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Play, RotateCcw } from 'lucide-react';
import { Package, PlacedPackage, PalletConfig, PackageStats } from '../types/pallet';
import { BinPackingAlgorithm } from '../utils/binPacking';
import { calculatePackageStats } from '../utils/statistics';
import { Scene3D } from '../components/Scene3D';
import { BottomView2D } from '../components/BottomView2D';
import { PalletConfigComponent } from '../components/PalletConfig';
import { PackageForm } from '../components/PackageForm';
import { PackageList } from '../components/PackageList';
import { StatsPanel } from '../components/StatsPanel';

const Index = () => {
  const [palletConfig, setPalletConfig] = useState<PalletConfig>({
    length: 1.2,
    width: 0.8,
    baseHeight: 0.15,
    loadHeight: 2.0,
    maxWeight: 1000,
  });

  const [packages, setPackages] = useState<Package[]>([]);
  const [placedPackages, setPlacedPackages] = useState<PlacedPackage[]>([]);
  const [stats, setStats] = useState<PackageStats>({
    totalPackages: 0,
    placedPackages: 0,
    totalVolume: 0,
    usedVolume: 0,
    totalWeight: 0,
    usedWeight: 0,
    volumeUtilization: 0,
    weightUtilization: 0,
    placementEfficiency: 0,
  });

  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    const newStats = calculatePackageStats(packages, placedPackages, palletConfig);
    setStats(newStats);
  }, [packages, placedPackages, palletConfig]);

  const handleAddPackage = (pkg: Package) => {
    setPackages(prev => [...prev, pkg]);
    toast.success(`Added ${pkg.name} (${pkg.duplicateCount} units)`);
  };

  const handleRemovePackage = (id: string) => {
    setPackages(prev => prev.filter(pkg => pkg.id !== id));
    setPlacedPackages(prev => prev.filter(pkg => !pkg.id.startsWith(id)));
    toast.info('Package removed');
  };

  const handleOptimizePacking = async () => {
    if (packages.length === 0) {
      toast.error('Add some packages first');
      return;
    }

    setIsOptimizing(true);
    toast.info('Optimizing pallet packing...');

    // Simulate processing time for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const algorithm = new BinPackingAlgorithm(palletConfig);
      const result = algorithm.packPackages(packages);
      
      setPlacedPackages(result);
      
      const totalPackageCount = packages.reduce((sum, pkg) => sum + pkg.duplicateCount, 0);
      const placedCount = result.length;
      
      toast.success(
        `Optimization complete! Placed ${placedCount}/${totalPackageCount} packages`,
        {
          description: `Efficiency: ${Math.round((placedCount / totalPackageCount) * 100)}%`
        }
      );
    } catch (error) {
      console.error('Packing optimization failed:', error);
      toast.error('Optimization failed. Please check your configuration.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleReset = () => {
    setPlacedPackages([]);
    toast.info('Packing visualization reset');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">
            3D Pallet Optimization System
          </h1>
          <p className="text-lg text-gray-600">
            Advanced bin packing with real-time 3D visualization
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Configuration & Packages */}
          <div className="space-y-6">
            <PalletConfigComponent 
              config={palletConfig} 
              onChange={setPalletConfig} 
            />
            
            <PackageForm 
              onAddPackage={handleAddPackage} 
              packageCount={packages.length}
            />
            
            <PackageList 
              packages={packages} 
              onRemovePackage={handleRemovePackage} 
            />
          </div>

          {/* Center Column - 3D Visualization */}
          <div className="xl:col-span-1 space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={handleOptimizePacking}
                disabled={isOptimizing || packages.length === 0}
                className="flex-1"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                {isOptimizing ? 'Optimizing...' : 'Optimize Packing'}
              </Button>
              
              <Button 
                onClick={handleReset}
                variant="outline"
                disabled={placedPackages.length === 0}
                size="lg"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            <Scene3D 
              palletConfig={palletConfig} 
              placedPackages={placedPackages} 
            />
          </div>

          {/* Right Column - Statistics and Bottom View */}
          <div className="space-y-6">
            <StatsPanel stats={stats} />
            
            <BottomView2D 
              palletConfig={palletConfig} 
              placedPackages={placedPackages || []} 
            />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-8">
          Advanced 3D Pallet Optimization • Built with React Three Fiber
        </div>
      </div>
    </div>
  );
};

export default Index;
