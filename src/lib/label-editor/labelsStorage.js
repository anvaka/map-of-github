import config from '../config'

let originalPlaces;
let indexedPlaces = new Map();

export async function getPlaceLabels() {
  let r = await fetch(config.placesSource, {mode: 'cors'})
  originalPlaces = await r.json();
  originalPlaces.features.forEach(f => {
    indexedPlaces.set(f.properties.labelId, f);
  });

  return mergePlacesWithLocalStorage(originalPlaces);
}

function savePlaceLabels(places) {
  // console.log(places);
  localStorage.setItem('places', JSON.stringify(places));
}

export function addLabelToPlaces(places, value, lngLat, mapZoomLevel) {
  let labelId = generateShortId();
  while (indexedPlaces.has(labelId)) labelId = generateShortId();

  const label = {
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [lngLat.lng, lngLat.lat].map(x => Math.round(x * 1000) / 1000)},
    properties: {symbolzoom: Math.ceil(mapZoomLevel), name: value, labelId}
  };
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
  const savedPlaces = JSON.parse(localStorage.getItem('places') || '{type: "FeatureCollection", features: []}');
  for (const savedPlace of savedPlaces.features) {
    const placeKey = savedPlace.properties.labelId;
    const place = indexedPlaces.get(placeKey);
    if (place) {
      // local override:
      Object.assign(place, savedPlace);
      indexedPlaces.set(placeKey, place);
    } else {
      // local only:
      indexedPlaces.set(placeKey, savedPlace);
    }
  }

  return {
    type: "FeatureCollection",
    features: Array.from(indexedPlaces.values())
  };
}

function generateShortId() {
  return Math.random().toString(36).substr(2, 5);
}