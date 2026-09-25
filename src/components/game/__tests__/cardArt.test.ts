import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CARDS, type DevCardType } from '@/engine';
import { ArtShapes, facetBackground } from '../cardArt';

const DEV: DevCardType[] = ['knight', 'roadBuilding', 'yearOfPlenty', 'monopoly', 'victoryPoint'];

describe('card art', () => {
  it('draws every resource, commodity and development card without broken geometry', () => {
    for (const card of [...CARDS, ...DEV]) {
      const svg = renderToStaticMarkup(createElement('svg', null, createElement(ArtShapes, { card, shadow: '#000000' })));
      expect(svg, card).not.toMatch(/NaN|undefined|Infinity/);
      expect((svg.match(/<polygon/g) ?? []).length, card).toBeGreaterThan(10);
    }
  });

  it('builds the faceted card background deterministically', () => {
    const a = facetBackground('#c4673f', 'brick');
    expect(a).toHaveLength(40);
    expect(a.every((f) => /^#[0-9a-f]{6}$/.test(f.fill) && !f.points.includes('NaN'))).toBe(true);
    expect(facetBackground('#c4673f', 'brick')).toBe(a);
  });
});
