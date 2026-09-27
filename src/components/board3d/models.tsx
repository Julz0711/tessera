'use client';

import { GEO, mat } from './materials';
import type { ModelProps } from './themes/types';

/** The classic pieces' shapes; themes can replace them (./themes). */
export function ClassicSettlement({ c, o, ghost }: ModelProps) {
  return (
    <>
      <mesh geometry={GEO.houseBody} material={mat(c.hex, o)} position={[0, 0.09, 0]} castShadow={!ghost} />
      <mesh geometry={GEO.houseRoof} material={mat(c.dark, o)} position={[0, 0.26, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={!ghost} />
    </>
  );
}

export function ClassicCity({ c, o, ghost }: ModelProps) {
  return (
    <>
      <mesh geometry={GEO.cityBase} material={mat(c.hex, o)} position={[0.04, 0.09, 0.02]} castShadow={!ghost} />
      <mesh geometry={GEO.cityTower} material={mat(c.hex, o)} position={[-0.1, 0.17, -0.02]} castShadow={!ghost} />
      <mesh geometry={GEO.cityRoof} material={mat(c.dark, o)} position={[-0.1, 0.42, -0.02]} rotation={[0, Math.PI / 4, 0]} castShadow={!ghost} />
      <mesh
        geometry={GEO.houseRoof}
        material={mat(c.dark, o)}
        position={[0.1, 0.24, 0.02]}
        rotation={[0, Math.PI / 4, 0]}
        scale={[0.9, 0.7, 0.9]}
        castShadow={!ghost}
      />
    </>
  );
}

export function ClassicRobber({ o, ghost }: { o: { opacity?: number }; ghost: boolean }) {
  return (
    <>
      <mesh geometry={GEO.robberBody} material={mat('#2d2c33', o)} position={[0, 0.21, 0]} castShadow={!ghost} />
      <mesh geometry={GEO.robberHead} material={mat('#3a3942', o)} position={[0, 0.47, 0]} castShadow={!ghost} />
    </>
  );
}
