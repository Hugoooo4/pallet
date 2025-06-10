
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PalletConfig } from '../types/pallet';

interface PalletConfigProps {
  config: PalletConfig;
  onChange: (config: PalletConfig) => void;
}

export function PalletConfigComponent({ config, onChange }: PalletConfigProps) {
  const handleChange = (field: keyof PalletConfig, value: number) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  return (
    <Card className="gradient-card shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">Pallet Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="length">Length (m)</Label>
            <Input
              id="length"
              type="number"
              step="0.01"
              value={config.length}
              onChange={(e) => handleChange('length', parseFloat(e.target.value) || 0)}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="width">Width (m)</Label>
            <Input
              id="width"
              type="number"
              step="0.01"
              value={config.width}
              onChange={(e) => handleChange('width', parseFloat(e.target.value) || 0)}
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="baseHeight">Base Height (m)</Label>
            <Input
              id="baseHeight"
              type="number"
              step="0.01"
              value={config.baseHeight}
              onChange={(e) => handleChange('baseHeight', parseFloat(e.target.value) || 0)}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loadHeight">Load Height (m)</Label>
            <Input
              id="loadHeight"
              type="number"
              step="0.01"
              value={config.loadHeight}
              onChange={(e) => handleChange('loadHeight', parseFloat(e.target.value) || 0)}
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxWeight">Max Weight (kg)</Label>
          <Input
            id="maxWeight"
            type="number"
            step="0.1"
            value={config.maxWeight}
            onChange={(e) => handleChange('maxWeight', parseFloat(e.target.value) || 0)}
            onFocus={(e) => e.target.select()}
          />
        </div>
      </CardContent>
    </Card>
  );
}
