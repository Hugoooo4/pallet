
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PackageStats } from '../types/pallet';
import { BarChart3, Package, Weight, Target } from 'lucide-react';

interface StatsPanelProps {
  stats: PackageStats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <Card className="gradient-card shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Packing Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Package Placement */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Packages Placed</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {stats.placedPackages} / {stats.totalPackages}
            </span>
          </div>
          <Progress value={stats.placementEfficiency} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {stats.placementEfficiency}% placement efficiency
          </p>
        </div>

        {/* Volume Utilization */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Volume Utilization</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {stats.usedVolume.toFixed(2)} / {stats.totalVolume.toFixed(2)} m³
            </span>
          </div>
          <Progress value={stats.volumeUtilization} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {stats.volumeUtilization}% of pallet volume used
          </p>
        </div>

        {/* Weight Utilization */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Weight className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium">Weight Utilization</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {stats.usedWeight.toFixed(1)} / {stats.totalWeight.toFixed(1)} kg
            </span>
          </div>
          <Progress value={stats.weightUtilization} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {stats.weightUtilization}% of max weight used
          </p>
        </div>

        {/* Summary */}
        <div className="pt-4 border-t border-border space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Volume</p>
              <p className="font-medium">{stats.totalVolume.toFixed(2)} m³</p>
            </div>
            <div>
              <p className="text-muted-foreground">Used Volume</p>
              <p className="font-medium">{stats.usedVolume.toFixed(2)} m³</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Weight</p>
              <p className="font-medium">{stats.totalWeight.toFixed(1)} kg</p>
            </div>
            <div>
              <p className="text-muted-foreground">Used Weight</p>
              <p className="font-medium">{stats.usedWeight.toFixed(1)} kg</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
