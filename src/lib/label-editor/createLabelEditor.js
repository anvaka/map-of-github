import maplibregl from 'maplibre-gl';
import {getPlaceLabels,  addLabelToPlaces, editLabelInPlaces} from './labelsStorage';
import createMarkerEditor from './createDOMMarkerEditor';
import bus from '../bus';

export default function createLabelEditor(map) {
  let places;
  const placeLabelLayers = ['place-country-1'];

  getPlaceLabels().then(loadedPlaces => {
    map.getSource('place').setData(loadedPlaces)
    places = loadedPlaces;
  });

  return {
    getContextMenuItems,
    getPlaces: () => places
  }

  function getContextMenuItems(e, borderOwnerId) {
    const labelFeature = map.queryRenderedFeatures(e.point, { layers: placeLabelLayers });
    let items = []
    if (labelFeature.length) {
      const label = labelFeature[0].properties;
      items.push({
        text: `Edit ${label.name}`,
        click: () => editLabel(labelFeature[0].geometry.coordinates, label)
      });
    } else {
      items.push({
        text: 'Add label',
        click: () => addLabel(e.lngLat, borderOwnerId)
      });
    }

    return items;
  }

  function addLabel(lngLat, borderOwnerId) {
    const markerEditor = createMarkerEditor(map, save);

    const marker = new maplibregl.Popup({closeButton: false});
    marker.setDOMContent(markerEditor.element);
    marker.setLngLat(lngLat);
    marker.addTo(map);

    markerEditor.setMarker(marker);

    function save(value) {
      if (!value) return;
      places = addLabelToPlaces(places, value, marker.getLngLat(), map.getZoom(), borderOwnerId);
      map.getSource('place').setData(places);
      bus.fire('unsaved-changes-detected', true);
    }
  }

  function editLabel(lngLat, oldLabelProps) {
    const markerEditor = createMarkerEditor(map, save, oldLabelProps.name);

    const marker = new maplibregl.Popup({closeButton: false});
    marker.setDOMContent(markerEditor.element);
    marker.setLngLat(lngLat);
    marker.addTo(map);

    markerEditor.setMarker(marker);

    function save(value) {
      places = editLabelInPlaces(oldLabelProps.labelId, places, value, marker.getLngLat(), map.getZoom());
      map.getSource('place').setData(places);
      bus.fire('unsaved-changes-detected', true);
    }
  }
}