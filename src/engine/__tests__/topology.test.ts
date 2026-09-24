import { describe, expect, it } from 'vitest';
import { STANDARD_HEX_COORDS, getTopology } from '../board/topology';

describe('standard board topology', () => {
  const topo = getTopology(STANDARD_HEX_COORDS);

  it('has 19 hexes, 54 vertices, 72 edges and 30 coast edges', () => {
    expect(topo.hexes).toHaveLength(19);
    expect(topo.vertices).toHaveLength(54);
    expect(topo.edges).toHaveLength(72);
    expect(topo.coast).toHaveLength(30);
  });

  it('gives every vertex 1–3 hexes and 2–3 neighbouring vertices', () => {
    for (const v of topo.vertices) {
      expect(v.hexes.length).toBeGreaterThanOrEqual(1);
      expect(v.hexes.length).toBeLessThanOrEqual(3);
      expect(v.vertices.length).toBeGreaterThanOrEqual(2);
      expect(v.vertices.length).toBeLessThanOrEqual(3);
      expect(v.edges.length).toBe(v.vertices.length);
    }
  });

  it('gives every edge 1–2 hexes and two adjacent endpoints', () => {
    for (const e of topo.edges) {
      expect(e.hexes.length).toBeGreaterThanOrEqual(1);
      expect(e.hexes.length).toBeLessThanOrEqual(2);
      expect(topo.vertices[e.a].vertices).toContain(e.b);
      expect(topo.edgeBetween(e.a, e.b)).toBe(e.id);
    }
  });

  it('gives each hex 6 distinct corners and 6 distinct sides', () => {
    for (const h of topo.hexes) {
      expect(new Set(h.vertices).size).toBe(6);
      expect(new Set(h.edges).size).toBe(6);
    }
  });

  it('orders the coast as a closed loop', () => {
    for (let i = 0; i < topo.coast.length; i++) {
      const e1 = topo.edges[topo.coast[i]];
      const e2 = topo.edges[topo.coast[(i + 1) % topo.coast.length]];
      const shared = [e1.a, e1.b].filter((v) => v === e2.a || v === e2.b);
      expect(shared).toHaveLength(1);
    }
  });

  it('memoises by layout', () => {
    expect(getTopology(STANDARD_HEX_COORDS)).toBe(topo);
  });
});
