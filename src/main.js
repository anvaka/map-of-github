import './assets/main.css'

let vueLoader = document.querySelector('.vue-loading');
let mapLoader = document.querySelector('.map-loading');

if (!webglSupported()) {
  document.body.innerHTML = `<div class='no-webgl'>
    <h4>WebGL is not enabled :(</h4>
    <p>This website needs <a href='https://en.wikipedia.org/wiki/WebGL' class='critical'>WebGL</a> to render a map of GitHub.
    </p> <p>
    You can try another browser. If the problem persists - very likely your video card isn't supported.
    </p>
  </div>`;
} else {
  if (vueLoader) vueLoader.innerText = 'Loading Vue containers...';
  if (mapLoader) mapLoader.innerText = 'Loading Map...';
  import( './lib/createMap.js').then(({default: createMap}) => {
    mapLoader?.remove();
    mapLoader = null;
    window.mapOwner = createMap();
    cleanUpLoaderIfNeeded();
  }).catch((e) => {
    console.error(e);
    mapLoader?.remove();
    mapLoader = null;
    showErrorMessage(e);
  });

  import('./startVue').then(({default: startVue}) => {
    vueLoader?.remove();
    vueLoader = null;
    startVue();
    cleanUpLoaderIfNeeded();
  }).catch(e => {
    console.error(e);
    vueLoader?.remove();
    vueLoader = null;
    showErrorMessage(e);
  });

  import( './lib/createFuzzySearcher.js').then(({default: createFuzzySearcher}) => {
    // This is kind of bad, but also make searching available in the console and easier to
    // hook with type-ahead.
    window.fuzzySearcher = createFuzzySearcher();
  })
}


function cleanUpLoaderIfNeeded() {
  if (!vueLoader && !mapLoader) {
    document.querySelector('.boot')?.remove();
  }
}

function webglSupported() {
  try {
    const canvas = document.createElement('canvas');
    return !!window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch (e) {
    return false;
  }
}

function showErrorMessage(e) {
  document.body.innerHTML = `<div class='no-webgl'>
    <h4>Something went wrong :(</h4>
    <p>
      Please try to reload the page. If the problem persists, please <a href='https://github.com/anvaka/map-of-github/issues' class='critical'>let me know</a>.
    </p>
    <p>
    The error message was: <pre class="error"></pre>
    </p>
  </div>`;
  document.querySelector('.error').innerText = e.message;
}

// Print friendly message to the viewer:
console.log(`%c 👋 Hello there!`, 'font-size: 24px; font-weight: bold;');
console.log('Thank you for checking out source code. You can read it here: ')
console.log('https://github.com/anvaka/map-of-github');
console.log('If you have any questions, please let me know');
