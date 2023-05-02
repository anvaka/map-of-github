import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import bus from './bus';
import config from './config';
import {getCustomLayer} from './gl/createLinesCollection.js';
import downloadGroupGraph from './downloadGroupGraph.js';

export default function createMap() {
  const map = new maplibregl.Map(getDefaultStyle());
  const fastLinesLayer = getCustomLayer();

  map.on('load', () => {
    map.addLayer(fastLinesLayer, 'circle-layer');
  })

  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['circle-layer'] });
    if (!features.length) return;

    const repo = features[0]?.properties.label
    if (!repo) return;
    const [lat, lon] = features[0].geometry.coordinates
    bus.fire('repo-selected', { text: repo, lat, lon });

    const borderFeature = map.queryRenderedFeatures(e.point, { layers: ['polygon-layer'] });
    const groupId = borderFeature[0]?.properties?.groupId;
    if (groupId !== undefined) {
      fastLinesLayer.clear();
      downloadGroupGraph(groupId).then(groupGraph => {
        groupGraph.forEachLink(link => {
          if (link.data?.e) return; // external;
          let from = groupGraph.getNode(link.fromId).data.l;
          let to = groupGraph.getNode(link.toId).data.l;

          from = maplibregl.MercatorCoordinate.fromLngLat({
            lng: from[0],
            lat: from[1]
          }),
          to = maplibregl.MercatorCoordinate.fromLngLat({
            lng: to[0],
            lat: to[1]
          }),
          fastLinesLayer.addLine({
            from: [from.x, from.y],
            to: [to.x, to.y],
            color: 0xffffff28
          });
        });
        map.redraw();
      })
    }
  });

  return map;
}

function getDefaultStyle() {
  return {
    hash: true,
    container: 'map',
    center: [0, 0],
    zoom: 4,
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'borders-source': { type: 'geojson', data: config.bordersSource, },
        'points-source': {
          type: 'vector',
          url: config.vectorTilesSource,
        },
      },
      layers: [
        {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#111'
        }
      },
        {
          'id': 'polygon-layer',
          'type': 'fill',
          'source': 'borders-source',
          filter: ['==', '$type', 'Polygon'],
          'paint': {
            'fill-color': ['get', 'fill'],
            // 'fill-outline-color': '#FFF',
          }
        },
        {
          id: 'circle-layer',
          type: 'circle',
          source: 'points-source',
          'source-layer': "points",
          filter: ['==', '$type', 'Point'],

          // This makes it slow
          // layout: {
          //   'circle-sort-key': ['-', 0, ['get', 'size']],
          // },
          paint: {
            'circle-color': "rgba(205, 205, 205, 0.8)",
            'circle-radius': [
              "interpolate",
              ["linear"],
              ["zoom"],
              5,  // zoom is 5 (or less) -> circle radius will be 1
              ['*', ['get', 'size'], .1],
              // 8, // zoom is 10 -> circle radius will be 5
              // ['*', ['get', 'size'], .5],
              23, // zoom is 15 (or greater) -> circle radius will be 10
              ['*', ['get', 'size'], 2.0],
            ]
          }
        },
        {
          id: 'label-layer',
          type: 'symbol',
          source: 'points-source',
          'source-layer': 'points',
          filter: [">=", ["zoom"], 8],
          layout: {
            'text-field': ['slice', ['get', 'label'], ['+', ['index-of', '/', ['get', 'label']], 1]],
            'text-anchor': 'top',
            'text-max-width': 10,
            'symbol-sort-key': ['-', 0, ['get', 'size']],
            'symbol-spacing': 500,
            'text-offset': [0, 0.5],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              8,
              ['/', ['get', 'size'], 4],
              10,
              ['+', ['get', 'size'], 8]
            ],
          },
          paint: {
            'text-color': '#FFF',
          },
        }
        // {
        //   id: 'circle-layer',
        //   type: 'circle',
        //   source: 'points-source',
        //   'source-layer': "points",
        //   layout: {
        //     'circle-sort-key': ['-', 0, ['get', 'size']],
        //   },
        //   paint: {
        //     "circle-radius": [
        //       "interpolate",
        //       ["linear"],
        //       ["zoom"],
        //       5,  // zoom is 5 (or less) -> circle radius will be 1
        //       ['*', ['get', 'size'], .1],
        //       8, // zoom is 10 -> circle radius will be 5
        //       ['*', ['get', 'size'], .5],
        //       15, // zoom is 15 (or greater) -> circle radius will be 10
        //       ['*', ['get', 'size'], 1.2],
        //     ],
        //     'circle-color': '#fFF', // Set the fill color of the circle
        //     'circle-opacity': 0.8
        //   },
        // }
      ]
    },
  };
}