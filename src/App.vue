<script setup>
import {ref} from 'vue';
import Typeahead from './components/Typeahead.vue';

import createMap from './lib/createMap';

let map = createMap();

let sidebarVisible = ref(false);
let currentProject = ref('');

function onTypeAheadInput() {
}

function closeSideBarViewer() {
}

function closeSideBarOnSmallScreen() {
}

function findProject(x) {
  map.flyTo({
    center: [x.lat, x.lon],
    zoom: 12,
  });
  currentProject.value = x.text;
  console.log(x)
}

</script>

<template>
  <div>
    <form @submit.prevent="onSubmit" class="search-box">
      <typeahead
        placeholder="Find Project"
        @menuClicked='sidebarVisible = true'
        @selected='findProject'
        @beforeClear='closeSideBarOnSmallScreen'
        @cleared='closeSideBarViewer'
        @inputChanged='onTypeAheadInput'
        :showClearButton="currentProject"
      ></typeahead>
    </form>
  </div>
</template>

<style scoped>
.search-box {
  position: absolute;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 -1px 0px rgba(0, 0, 0, 0.02);
  height: 48px;
  font-size: 16px;
  margin-top: 16px;
  padding: 0;
  cursor: text;
  left: 8px;
  width: var(--side-panel-width);
}
@media (min-width: 1024px) {
}
</style>
