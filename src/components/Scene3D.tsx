
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { PlacedPackage, PalletConfig } from '../types/pallet';
import * as THREE from 'three';

interface Scene3DProps {
  palletConfig: PalletConfig;
  placedPackages: PlacedPackage[];
}

// Safe number conversion with strict validation
const toSafeNumber = (value: any, fallback: number = 0): number => {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  return (!isNaN(num) && isFinite(num) && num > 0) ? num : fallback;
};

function PalletBase({ config }: { config: PalletConfig }) {
  const length = toSafeNumber(config?.length, 1.2);
  const width = toSafeNumber(config?.width, 0.8);
  const baseHeight = toSafeNumber(config?.baseHeight, 0.15);
  const loadHeight = toSafeNumber(config?.loadHeight, 2.0);

  return (
    <group>
      {/* Pallet base */}
      <mesh position={[length / 2, baseHeight / 2, width / 2]}>
        <boxGeometry args={[length, baseHeight, width]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Load area wireframe */}
      <mesh position={[length / 2, baseHeight + loadHeight / 2, width / 2]}>
        <boxGeometry args={[length, loadHeight, width]} />
        <meshBasicMaterial 
          color="#00ff00" 
          wireframe={true}
          transparent={true}
          opacity={0.2}
        />
      </mesh>
    </group>
  );
}

function PackageBox({ pkg }: { pkg: PlacedPackage }) {
  const x = toSafeNumber(pkg?.x, 0);
  const y = toSafeNumber(pkg?.y, 0);
  const z = toSafeNumber(pkg?.z, 0);
  const actualLength = toSafeNumber(pkg?.actualLength, 0.1);
  const actualHeight = toSafeNumber(pkg?.actualHeight, 0.1);
  const actualWidth = toSafeNumber(pkg?.actualWidth, 0.1);
  const color = pkg?.color || '#3B82F6';

  return (
    <group position={[
      x + actualLength / 2,
      y + actualHeight / 2,
      z + actualWidth / 2
    ]}>
      {/* Main package box */}
      <mesh>
        <boxGeometry args={[actualLength, actualHeight, actualWidth]} />
        <meshStandardMaterial 
          color={color} 
          transparent={true}
          opacity={0.9}
        />
      </mesh>
      
      {/* Edge lines for better separation */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(actualLength, actualHeight, actualWidth)]} />
        <lineBasicMaterial color="#000000" linewidth={2} />
      </lineSegments>
    </group>
  );
}

function Scene({ palletConfig, placedPackages }: Scene3DProps) {
  const safePackages = Array.isArray(placedPackages) ? placedPackages : [];

  return (
    <>
      {/* Lighting setup */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <directionalLight position={[-10, 10, -5]} intensity={0.4} />

      {/* Pallet and load area */}
      <PalletBase config={palletConfig} />

      {/* Placed packages */}
      {safePackages.map((pkg, index) => (
        <PackageBox key={`package-${index}`} pkg={pkg} />
      ))}
    </>
  );
}

export function Scene3D({ palletConfig, placedPackages }: Scene3DProps) {
  if (!palletConfig) {
    return (
      <div className="w-full h-[600px] rounded-lg overflow-hidden border border-border shadow-lg flex items-center justify-center bg-white">
        <p>Loading 3D scene...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-border shadow-lg bg-white">
      <Canvas
        camera={{ 
          position: [15, 12, 15], 
          fov: 60,
          near: 0.1,
          far: 1000
        }}
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: "high-performance"
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#ffffff']} />
        <Scene palletConfig={palletConfig} placedPackages={placedPackages || []} />
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
