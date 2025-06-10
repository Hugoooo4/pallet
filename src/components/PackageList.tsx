
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Package as PackageIcon } from 'lucide-react';
import { Package } from '../types/pallet';

interface PackageListProps {
  packages: Package[];
  onRemovePackage: (id: string) => void;
}

export function PackageList({ packages, onRemovePackage }: PackageListProps) {
  const getRotationLabel = (rotationType: string) => {
    switch (rotationType) {
      case 'all': return 'All Directions';
      case 'horizontal': return 'Horizontal';
      case 'vertical': return 'Vertical';
      default: return rotationType;
    }
  };

  return (
    <Card className="gradient-card shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground flex items-center">
          <PackageIcon className="w-5 h-5 mr-2" />
          Packages ({packages.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {packages.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No packages added yet</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: pkg.color }}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{pkg.name}</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Dimensions: {pkg.length}×{pkg.width}×{pkg.height}m</p>
                      <p>Weight: {pkg.weight}kg</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {getRotationLabel(pkg.rotationType)}
                        </Badge>
                        <Badge variant="outline">
                          Qty: {pkg.duplicateCount}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onRemovePackage(pkg.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
