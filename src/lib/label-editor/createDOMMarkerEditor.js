
export default function createDOMarkerEditor(map, onSave, defaultText) {
  const element = document.createElement('div');
  element.className = 'label-marker';
  element.innerHTML = `<form class="mini-label">
  <input type="text" placeholder="Label" />
  <div class='commands'>
    <a href='#' class="cancel" tabindex="3">Cancel</a>
    <a href='#' class="accept">Save</a>
  </div>
  </div>`;

  if (defaultText) element.querySelector('input').value = defaultText;

  let marker; 
  let startX = 0;
  let startY = 0;
  let dx = 0, dy = 0;

  listenToEvents();

  return {
    element,
    setMarker: (newMarker) => { marker = newMarker; },
  }

  function submit(e) {
    e.preventDefault(); 
    onSave(element.querySelector('input').value);
    close();
  }

  function listenToEvents() {
    document.addEventListener('keydown', onKeyDown);
    element.querySelector('form').addEventListener('submit', submit);
    element.querySelector('.cancel').addEventListener('click', (e) => {
      e.preventDefault();
      close();
    });

    element.querySelector('.accept').addEventListener('click', (e) => {
      submit(e);
    });

    element.addEventListener('pointerdown', (e) => {
      startX = e.clientX; startY = e.clientY;
      let markerCoordinates = map.project(marker.getLngLat());
      dx = markerCoordinates.x - startX;
      dy = markerCoordinates.y - startY;
      window.addEventListener('pointermove', onPointerMove, true);
      window.addEventListener('pointerup', cleanUp, true);
    });
  }

  function onPointerMove(e) {
    const newLngLat = map.unproject([e.clientX + dx, e.clientY + dy]);
    marker.setLngLat(newLngLat);
  }

  function cleanUp() {
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('pointermove', onPointerMove, true);
    window.removeEventListener('pointerup', cleanUp, true);
  }

  function close() {
    marker.remove();
    cleanUp();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      close();
      e.preventDefault();
    }
  }
}