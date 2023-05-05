const server = 'http://192.168.86.79:8081/';

export default {
  serverUrl: '',
  vectorTilesSource: 'http://192.168.86.79:8082/data/cities.json',
  vectorTilesTiles: `${server}v1/points/{z}/{x}/{y}.pbf`,
  glyphsSource: `${server}/fonts/{fontstack}/{range}.pbf`,
  bordersSource: `${server}v1/borders.geojson`,
  placesSource: `${server}v1/places.geojson`,

  namesEndpoint: `${server}v1/names`,
  graphsEndpoint: `${server}v1/graphs`,
};