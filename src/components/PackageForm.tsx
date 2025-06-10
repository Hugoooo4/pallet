import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { Package, RotationType } from '../types/pallet';
import { v4 as uuidv4 } from 'uuid';

interface PackageFormProps {
  onAddPackage: (pkg: Package) => void;
  packageCount: number;
}

const PACKAGE_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

export function PackageForm({ onAddPackage, packageCount }: PackageFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    length: 40, // 40cm default
    width: 30,  // 30cm default
    height: 20, // 20cm default
    weight: 5,  // 5kg default
    rotationType: 'all' as RotationType,
    duplicateCount: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use default package name if none provided
    const packageName = formData.name.trim() || `Package ${packageCount + 1}`;
    
    const newPackage: Package = {
      id: uuidv4(),
      ...formData,
      name: packageName,
      // Convert cm to meters for internal calculations
      length: formData.length / 100,
      width: formData.width / 100,
      height: formData.height / 100,
      color: PACKAGE_COLORS[Math.floor(Math.random() * PACKAGE_COLORS.length)],
    };

    onAddPackage(newPackage);
    
    // Reset only name, keep other values
    setFormData(prev => ({
      ...prev,
      name: '',
    }));
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="gradient-card shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">Add Package</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="packageName">Package Name</Label>
            <Input
              id="packageName"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder={`Package ${packageCount + 1}`}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="packageLength">Length (cm)</Label>
              <Input
                id="packageLength"
                type="number"
                step="1"
                min="1"
                value={formData.length}
                onChange={(e) => handleChange('length', parseFloat(e.target.value) || 40)}
                onFocus={(e) => e.target.select()}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="packageWidth">Width (cm)</Label>
              <Input
                id="packageWidth"
                type="number"
                step="1"
                min="1"
                value={formData.width}
                onChange={(e) => handleChange('width', parseFloat(e.target.value) || 30)}
                onFocus={(e) => e.target.select()}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="packageHeight">Height (cm)</Label>
              <Input
                id="packageHeight"
                type="number"
                step="1"
                min="1"
                value={formData.height}
                onChange={(e) => handleChange('height', parseFloat(e.target.value) || 20)}
                onFocus={(e) => e.target.select()}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="packageWeight">Weight (kg)</Label>
              <Input
                id="packageWeight"
                type="number"
                step="0.1"
                min="0.1"
                value={formData.weight}
                onChange={(e) => handleChange('weight', parseFloat(e.target.value) || 5)}
                onFocus={(e) => e.target.select()}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duplicateCount">Quantity</Label>
              <Input
                id="duplicateCount"
                type="number"
                min="1"
                value={formData.duplicateCount}
                onChange={(e) => handleChange('duplicateCount', parseInt(e.target.value) || 1)}
                onFocus={(e) => e.target.select()}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rotationType">Rotation Type</Label>
            <Select 
              value={formData.rotationType} 
              onValueChange={(value: RotationType) => handleChange('rotationType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rotation type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="horizontal">Horizontal Only</SelectItem>
                <SelectItem value="vertical">Vertical Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Package
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
