import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'


const app = createApp(App);
app.directive('focus', {
  mounted(el) {
    el.focus()
  }
});

app.mount('#app')

import( './lib/createMap.js').then(({default: createMap}) => {
  window.mapOwner = createMap();
});

import( './lib/createFuzzySearcher.js').then(({default: createFuzzySearcher}) => {
  // This is kind of bad, but also make searching available in the console and easier to
  // hook with type-ahead.
  window.fuzzySearcher = createFuzzySearcher();
})