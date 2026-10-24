import assert from 'node:assert/strict';
import test from 'node:test';
import findNearestCity from '../src/lib/findNearestCity.mjs';

const nearestFeature = {
  properties: { label: 'screen-nearest' },
  geometry: { coordinates: [-10, 0] },
};
const fartherFeature = {
  properties: { label: 'screen-farther' },
  geometry: { coordinates: [10, 0] },
};

test('selects the closest rendered repository in screen coordinates', () => {
  const projected = new Map([
    [-10, { x: 101, y: 100 }],
    [10, { x: 107, y: 100 }],
  ]);
  let query;
  const map = {
    queryRenderedFeatures(box, options) {
      query = { box, options };
      return [nearestFeature, fartherFeature];
    },
    project([longitude]) {
      return projected.get(longitude);
    },
  };

  assert.equal(findNearestCity(map, { x: 100, y: 100 }), nearestFeature);
  assert.deepEqual(query, {
    box: [[92, 92], [108, 108]],
    options: { layers: ['circle-layer'] },
  });
});

test('returns no repository when the rendered hit box is empty', () => {
  const map = {
    queryRenderedFeatures() { return []; },
    project() { throw new Error('project should not be called'); },
  };

  assert.equal(findNearestCity(map, { x: 100, y: 100 }), undefined);
});
