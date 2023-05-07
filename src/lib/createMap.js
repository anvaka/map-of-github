import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import bus from './bus';
import config from './config';
import {getCustomLayer} from './gl/createLinesCollection.js';
import downloadGroupGraph from './downloadGroupGraph.js';
import getComplimentaryColor from './getComplimentaryColor';
import createLabelEditor from './label-editor/createLabelEditor';

const primaryHighlightColor = '#bf2072';
const secondaryHighlightColor = '#e56aaa';

export default function createMap() {
  const map = new maplibregl.Map(getDefaultStyle());
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();
  const fastLinesLayer = getCustomLayer();
  let backgroundEdgesFetch;
  let labelEditor;
  // collection of labels.

  map.on('load', () => {
    map.addLayer(fastLinesLayer, 'circle-layer');
    labelEditor = createLabelEditor(map);
  });

  map.on('contextmenu', (e) => {
    bus.fire('show-tooltip');
    
    const contextMenuItems = { 
      items: labelEditor.getContextMenuItems(e),
      left: e.point.x + 'px', 
      top: e.point.y + 'px' 
    };
    let bg = getBackgroundNearPoint(e.point);
    if (bg) {
      contextMenuItems.items.push({
        text: 'Show largest projects',
        click: () => {
          let seen = new Map();
          let largeRepositories = map.querySourceFeatures('points-source', {
              sourceLayer: 'points',
              filter: ['==', 'parent', bg.id]
          }).sort((a, b) => {
            return b.properties.size - a.properties.size;
          });
          for (let repo of largeRepositories) {
            let v = {
              name: repo.properties.label,
              lngLat: repo.geometry.coordinates,
            }
            if (seen.has(repo.properties.label)) continue;
            seen.set(repo.properties.label, v);
            if (seen.size >= 100) break;
          }
          
          map.setFilter('border-highlight', ['==', ['id'], bg.id]);
          map.setLayoutProperty('border-highlight', 'visibility', 'visible');
          bus.fire('show-largest', Array.from(seen.values()));
        }
      });
    }


    bus.fire('show-context-menu', contextMenuItems);
  });

  map.on('mousemove', (e) => {
    // let hoveredFeature = findNearestCity(e.point);
    // if (hoveredFeature) {
    //   const bgFeature = getBackgroundNearPoint(e.point);
    //   bus.fire('show-tooltip', { 
    //     text: hoveredFeature.properties.label, 
    //     left: e.point.x + 'px',
    //     top: e.point.y + 'px',
    //     background: bgFeature?.properties?.fill || 'rgba(0,0,0,0.5)',
    //   });
    // } else {
    //   bus.fire('show-tooltip');
    // }
  });

  map.on('click', (e) => {
    bus.fire('show-context-menu');
    const nearestCity = findNearestCity(e.point);
    if (!nearestCity) return;
    const repo = nearestCity.properties.label
    if (!repo) return;
    const [lat, lon] = nearestCity.geometry.coordinates
    bus.fire('show-tooltip');
    bus.fire('repo-selected', { text: repo, lat, lon });

    drawBackgroundEdges(e.point, repo);
  });

  return {
    map,
    dispose() {
      map.remove();
      // TODO: Remove custom layer?
    },
    makeVisible,
    clearHighlights,
    clearBorderHighlights,
    getPlacesGeoJSON,
  }

  function getPlacesGeoJSON() {
    return labelEditor.getPlaces();
  }

  function clearBorderHighlights() {
    map.setLayoutProperty('border-highlight', 'visibility', 'none');
  }

  function clearHighlights() {
    fastLinesLayer.clear();
    map.getSource('selected-nodes').setData({
      type: 'FeatureCollection',
      features: []
    });
    map.redraw();
  }

  function makeVisible(repository, location) {
    map.flyTo(location);
    map.once('moveend', () => {
      drawBackgroundEdges(location.center, repository);
    });
  }

  function getBackgroundNearPoint(point) {
    const borderFeature = map.queryRenderedFeatures(point, { layers: ['polygon-layer'] });
    return borderFeature[0];
  }

  function drawBackgroundEdges(point, repo) {
    const bgFeature = getBackgroundNearPoint(point);
    if (!bgFeature) return;
    const groupId = bgFeature.id;
    if (groupId === undefined) return;

    const fillColor = bgFeature.properties.fill;
    let complimentaryColor = getComplimentaryColor(fillColor);
    fastLinesLayer.clear();
    backgroundEdgesFetch?.cancel();
    let isCancelled = false;
    let highlightedNodes = {
      type: 'FeatureCollection',
      features: []
    };

    backgroundEdgesFetch = downloadGroupGraph(groupId).then(groupGraph => {
      if (isCancelled) return;
      let firstLevelLinks = [];
      let primaryNodePosition;
      groupGraph.forEachLink(link => {
        if (link.data?.e) return; // external;
        const fromGeo = groupGraph.getNode(link.fromId).data.l;
        const toGeo = groupGraph.getNode(link.toId).data.l;

        const from = maplibregl.MercatorCoordinate.fromLngLat(fromGeo);
        const to = maplibregl.MercatorCoordinate.fromLngLat(toGeo);
        const isFirstLevel = repo === link.fromId || repo === link.toId;
        const line = {
          from: [from.x, from.y],
          to: [to.x, to.y],
          color: isFirstLevel ? 0xffffffFF : complimentaryColor 
        }
        // delay first level links to be drawn last, so that they are on the top
        if (isFirstLevel) {
          firstLevelLinks.push(line);

          if (!primaryNodePosition) {
            primaryNodePosition = repo === link.fromId ? fromGeo : toGeo;
            highlightedNodes.features.push({
              type: 'Feature',
              geometry: {type: 'Point', coordinates: primaryNodePosition},
              properties: {color: primaryHighlightColor, name: repo, background: fillColor, textSize: 1.2}
            });
          } 
          let otherName = repo === link.fromId ? link.toId : link.fromId;
          // pick the other one too:
          highlightedNodes.features.push({
            type: 'Feature',
            geometry: {type: 'Point', coordinates: repo === link.fromId ? toGeo : fromGeo},
            properties: {color: secondaryHighlightColor, name: otherName, background: fillColor, textSize: 0.8}
          });
        } else fastLinesLayer.addLine(line);
      });
      firstLevelLinks.forEach(line => {
        fastLinesLayer.addLine(line)
      });
      map.getSource('selected-nodes').setData(highlightedNodes);
      map.redraw();
    });
    backgroundEdgesFetch.cancel = () => {isCancelled = true};
  }

  function findNearestCity(point) {
    let width = 16;
    let height = 16;
    const features = map.queryRenderedFeatures([
      [point.x - width / 2, point.y - height / 2],
      [point.x + width / 2, point.y + height / 2]
    ], { layers: ['circle-layer'] });
    if (!features.length) return;
    let distance = Infinity;
    let nearestCity = null;
    features.forEach(feature => {
      let geometry = feature.geometry.coordinates;
      let dx = geometry[0] - point.x;
      let dy = geometry[1] - point.y;
      let d = dx * dx + dy * dy;
      if (d < distance) {
        distance = d;
        nearestCity = feature;
      }
    });
    return nearestCity;
  }
}

function getDefaultStyle() {
  return {
    hash: true,
    container: 'map',
    center: [0, 0],
    zoom: 4,
    style: {
      version: 8,
      glyphs: config.glyphsSource,
      sources: {
        'borders-source': { type: 'geojson', data: config.bordersSource, },
        'points-source': {
          type: 'vector',
          tiles: [config.vectorTilesTiles],
          minzoom: 4,
          maxzoom: 7,
          center: [-9.843750,4.213679,7],
          bounds: [-54.781000,-47.422000,54.781000,47.422000]
        },
        'place': { // this one loaded asynchronously, and merged with local storage data
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        },
        'selected-nodes': {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [] 
          }
        }
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
            // 'fill-outline-color': [
            //   'case',
            //   ['boolean', ['feature-state', 'open'], false],
            //   '#FFF',
            //   'rgba(0,0,0,0)'
            // ],
            // 'fill-outline-color': '#FFF',
          }
        },
        {
          'id': 'border-highlight',
          'type': 'line',
          'source': 'borders-source',
          'layout': {
            'visibility': 'none'
          },
          'paint': {
            'line-color': '#FFF',
            'line-width': 4,
          }
        },
        {
          id: 'circle-layer',
          type: 'circle',
          source: 'points-source',
          'source-layer': "points",
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-color': '#fff',
            'circle-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              5,
              0.1,
              15,
              0.9
            ],
            'circle-stroke-width': 1,
            'circle-stroke-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              8,
              0.0,
              15,
              0.9
            ],
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              5,  // zoom is 5 (or less) -> circle radius will be 1
              ['*', ['get', 'size'], .1],
              23, // zoom is 15 (or greater) -> circle radius will be 10
              ['*', ['get', 'size'], 1.5],
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
            'text-font': [ 'Roboto Condensed Regular' ],
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
        }, 
        {
          id: 'selected-nodes-layer',
          type: 'circle',
          source: 'selected-nodes',
          paint: {
            'circle-color': ['get', 'color'],
          }
        },
        {
          id: 'selected-nodes-labels-layer',
          type: 'symbol',
          source: 'selected-nodes',
          layout: {
            'text-font': [ 'Roboto Condensed Regular' ],
            'text-field': ['get', 'name'],
            'text-anchor': 'top',
            'text-max-width': 10,
            'symbol-sort-key': ['-', 0, ['get', 'textSize']],
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
            'text-color': '#fff',
            'text-halo-color': ['get', 'color'],
            'text-halo-width': 2,
          },
        },
        // TODO: move labels stuff to label editor?
{
    "id": "place-country-1",
    minzoom: 1, 
    maxzoom: 10,
    type: "symbol",
    source: "place",
    "layout": {
        "text-font": [ "Roboto Condensed Bold" ],
        "text-size": [
          "interpolate",
          [ "cubic-bezier", 0.2, 0, 0.7, 1 ],
          ["zoom"],
          1,
          [
            "step",
            ["get", "symbolzoom"], 11, 
            4, 9, 
            5, 8
          ],
          9,
          [
            "step",
            ["get", "symbolzoom"], 22,
            4, 19,
            5, 17
          ]
        ],
        'symbol-sort-key': ['get', 'symbolzoom'],
        "text-field": "{name}",
        "text-max-width": 6,
        "text-line-height": 1.1,
        "text-letter-spacing": 0,
    },
    "paint": {
      'text-color': '#FFF',
    },

    filter: [">", "symbolzoom", 1],
},
{
    "id": "place-country-0",
    type: "symbol",
    source: "place",
    maxzoom: 1,
    "layout": {
        "text-font": [ "Roboto Condensed Bold" ],
        "text-size": 14,
        "text-field": "{name}",
        "text-max-width": 6.25,
    },
    "paint": {
        "text-color": "#FFF",
    },
},
      ]
    },
  };
}
