
import { PlacedPackage, PalletConfig } from '../types/pallet';

interface BottomView2DProps {
  palletConfig: PalletConfig;
  placedPackages: PlacedPackage[];
}

export function BottomView2D({ palletConfig, placedPackages }: BottomView2DProps) {
  const scale = 200; // Scale factor for visualization
  const padding = 10;
  
  const viewWidth = palletConfig.length * scale + padding * 2;
  const viewHeight = palletConfig.width * scale + padding * 2;

  // Filter packages at the lowest level (on the pallet base)
  const lowestPackages = placedPackages.filter(pkg => 
    Math.abs(pkg.y - palletConfig.baseHeight) < 0.01
  );

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Bottom Layer View</h3>
      <svg 
        width={viewWidth} 
        height={viewHeight}
        className="border border-gray-200"
      >
        {/* Pallet outline */}
        <rect
          x={padding}
          y={padding}
          width={palletConfig.length * scale}
          height={palletConfig.width * scale}
          fill="#f3f4f6"
          stroke="#6b7280"
          strokeWidth="2"
        />
        
        {/* Render lowest packages */}
        {lowestPackages.map((pkg, index) => (
          <g key={`bottom-${pkg.id}-${index}`}>
            <rect
              x={padding + pkg.x * scale}
              y={padding + pkg.z * scale}
              width={pkg.actualLength * scale}
              height={pkg.actualWidth * scale}
              fill={pkg.color}
              stroke="#374151"
              strokeWidth="1"
              opacity="0.8"
            />
            <text
              x={padding + pkg.x * scale + (pkg.actualLength * scale) / 2}
              y={padding + pkg.z * scale + (pkg.actualWidth * scale) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fill="white"
              fontWeight="bold"
            >
              {pkg.name.split(' ')[1] || pkg.name.substring(0, 3)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
