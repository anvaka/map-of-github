export default function findNearestCity(map, point) {
  const width = 16;
  const height = 16;
  const features = map.queryRenderedFeatures([
    [point.x - width / 2, point.y - height / 2],
    [point.x + width / 2, point.y + height / 2]
  ], { layers: ["circle-layer"] });
  if (!features.length) return;

  let distance = Infinity;
  let nearestCity = null;
  features.forEach(feature => {
    const projected = map.project(feature.geometry.coordinates);
    const dx = projected.x - point.x;
    const dy = projected.y - point.y;
    const d = dx * dx + dy * dy;
    if (d < distance) {
      distance = d;
      nearestCity = feature;
    }
  });
  return nearestCity;
}
