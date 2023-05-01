import maplibregl from 'maplibre-gl';
import bus from './bus';
import config from './config';

export default function createMap() {
  const map = new maplibregl.Map(getDefaultStyle());

  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['circle-layer'] });
    if (!features.length) return;

    let repo = features[0]?.properties.label
    if (!repo) return;
    bus.fire('repo-selected', repo);

  //   fetch('https://libraries.io/api/github/' + repo, { mode: 'cors' }).then(x => x.json()).then(x => {
  //     document.querySelector('.readme-content').innerHTML = '';
  //     if (!x) {
  //       console.warn('Could not find repo', repo)
  //       return;
  //     }
  //     const { has_readme: readme, default_branch } = x;
  //     const sidebar = document.querySelector('.sidebar-header');
  //     sidebar.replaceChildren(createGithubCard(x));
  //     if (readme && default_branch) {
  //       tryReadme(repo, readme, default_branch);
  //     } else {
  //       tryReadme(repo, 'README.md', 'master').catch(err => {
  //         console.error('Could not find readme', err)
  //       });
  //     }
  //   });

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
          'id': 'polygon-layer',
          'type': 'fill',
          'source': 'borders-source',
          filter: ['==', '$type', 'Polygon'],
          'paint': {
            'fill-color': ['get', 'fill'],
            'fill-outline-color': '#FFF',
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