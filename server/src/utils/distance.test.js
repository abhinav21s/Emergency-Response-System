import test from 'node:test';
import assert from 'node:assert/strict';
import { findNearestAmbulance, haversineDistanceKm } from './distance.js';

test('haversine distance is zero for identical points', () => {
  assert.equal(haversineDistanceKm(12.97, 77.59, 12.97, 77.59), 0);
});

test('nearest selection ignores ownership and uses distance', () => {
  const result = findNearestAmbulance([
    { name: 'Public far', type: 'public', lat: 13.1, lng: 77.7 },
    { name: 'Private near', type: 'private', lat: 12.9717, lng: 77.5948 }
  ], { lat: 12.9716, lng: 77.5946 });
  assert.equal(result.ambulance.name, 'Private near');
});
