import config from '../config'
import generateShortRandomId from '../generateShortRandomId';
import bus from '../bus';

let originalPlaces;
let indexedPlaces = new Map();

export async function getPlaceLabels() {
  let r = await fetch(config.placesSource, {mode: 'cors'})
  originalPlaces = await r.json();
  originalPlaces.features.forEach(f => {
    indexedPlaces.set(f.properties.labelId, f);
  });

  const mergedLabels = mergePlacesWithLocalStorage(originalPlaces);
  const hasChanges = checkOriginalPlacesForChanges(mergedLabels);
  if (hasChanges) {
    bus.fire('unsaved-changes-detected', hasChanges);
  }
  return mergedLabels;
}

function savePlaceLabels(places) {
  localStorage.setItem('places', JSON.stringify(places));
}

export function addLabelToPlaces(places, value, lngLat, mapZoomLevel, borderOwnerId) {
  let labelId = generateShortRandomId();
  while (indexedPlaces.has(labelId)) labelId = generateShortRandomId();

  const label = {
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [lngLat.lng, lngLat.lat].map(x => Math.round(x * 1000) / 1000)},
    properties: {symbolzoom: Math.ceil(mapZoomLevel), name: value, labelId}
  };
  if (borderOwnerId !== undefined) {
    label.properties.ownerId = borderOwnerId;
  }
  places.features.push(label);

  indexedPlaces.set(labelId, label);
  savePlaceLabels(places);
  return places;
}

export function editLabelInPlaces(labelId, places, value, lngLat, mapZoomLevel) {
  if (!value) {
    places.features = places.features.filter(f => f.properties.labelId !== labelId);
    indexedPlaces.delete(labelId);
  } else {
    const labelToModify = places.features.find(f => f.properties.labelId === labelId);
    labelToModify.properties.name = value;
    labelToModify.properties.symbolzoom = Math.ceil(mapZoomLevel)
    labelToModify.geometry.coordinates = [lngLat.lng, lngLat.lat].map(x => Math.round(x * 1000) / 1000);
    indexedPlaces.set(labelId, labelToModify);
  }

  savePlaceLabels(places);
  return places;
}

function mergePlacesWithLocalStorage() {
  const savedPlaces = JSON.parse(localStorage.getItem('places')) || {type: "FeatureCollection", features: []};
  let mergeIndex = new Map();
  for (const savedPlace of savedPlaces.features) {
    const placeKey = savedPlace.properties.labelId;
    const place = mergeIndex.get(placeKey);
    if (place) {
      // local override:
      mergeIndex.set(placeKey, Object.assign({}, place, savedPlace));
    } else {
      // local only:
      mergeIndex.set(placeKey, savedPlace);
    }
  }

  indexedPlaces.forEach((place, placeKey) => {
    if (!mergeIndex.has(placeKey)) {
      // remote only:
      mergeIndex.set(placeKey, place);
    }
  });


  return {
    type: "FeatureCollection",
    features: Array.from(mergeIndex.values())
  };
}

function checkOriginalPlacesForChanges(mergedPlaces) {
  if (!originalPlaces) return false;

  for (const resolvedPlace of mergedPlaces.features) {
    const placeKey = resolvedPlace.properties.labelId;
    const place = indexedPlaces.get(placeKey);
    if (!place) return true;
    if (place.properties.name !== resolvedPlace.properties.name) return true;
    if (place.properties.symbolzoom !== resolvedPlace.properties.symbolzoom) return true; 
    if (place.geometry.coordinates[0] !== resolvedPlace.geometry.coordinates[0]) return true;
    if (place.geometry.coordinates[1] !== resolvedPlace.geometry.coordinates[1]) return true; 
  }

  return false;
}