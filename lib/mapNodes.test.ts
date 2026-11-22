import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plottableNodes } from './mapNodes.ts';

describe('plottableNodes', () => {
  it('keeps nodes that have numeric coordinates', () => {
    const nodes = plottableNodes([
      { id: 'a', type: 'donor', name: 'Kitchen', lat: 13.08, lng: 80.21 },
      { id: 'b', type: 'ngo', name: 'Shelter', lat: null, lng: 80.2 },
      { id: 'c', type: 'volunteer', name: 'Courier', lat: Number.NaN, lng: 80.2 },
    ]);
    assert.deepEqual(nodes.map((node) => node.id), ['a']);
  });

  it('treats a missing feed as an empty map', () => {
    assert.deepEqual(plottableNodes(undefined), []);
  });
});
