<script setup>
import {ref, onBeforeUnmount, onBeforeMount} from 'vue';
import TypeAhead from './components/TypeAhead.vue';
import GithubRepository from './components/GithubRepository.vue';
import bus from './lib/bus'

import createMap from './lib/createMap';

let map = createMap();

let sidebarVisible = ref(false);
let currentProject = ref(''); 
let lastSelected;

function onTypeAheadInput() {
}

function closeSideBarViewer() {
  sidebarVisible.value = false;
  currentProject.value = '';
}

function closeSideBarOnSmallScreen() {
  closeSideBarViewer();
}

function findProject(x) {
  if (x.lat === undefined && lastSelected && x.text === lastSelected.text) {
    x = lastSelected;
  } else {
    lastSelected = x;
  }
  map.flyTo({
    center: [x.lat, x.lon],
    zoom: 12,
  });
  currentProject.value = x.text;
  console.log(x)
}

function onRepoSelected(repo) {
  lastSelected = repo;
  currentProject.value = repo.text;
}

onBeforeUnmount(() => {
  if (map) {
    map.remove();
  }
  bus.off('repo-selected', onRepoSelected);
})

onBeforeMount(() => {
  bus.on('repo-selected', onRepoSelected);
})

</script>

<template>
  <div>
    <github-repository :name="currentProject" v-if="currentProject"></github-repository>
    <form @submit.prevent="onSubmit" class="search-box">
      <type-ahead
        placeholder="Find Project"
        @menuClicked='sidebarVisible = true'
        @selected='findProject'
        @beforeClear='closeSideBarOnSmallScreen'
        @cleared='closeSideBarViewer'
        @inputChanged='onTypeAheadInput'
        :showClearButton="currentProject"
        :query="currentProject"
      ></type-ahead>
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
.repo-viewer {
  position: absolute;
  left: 0;
  top: 0;
  width: calc(var(--side-panel-width) + 16px);
  height: 100vh;
  overflow: auto;
  background: var(--color-background);
  border-right: 1px solid var(--color-border);
}
@media (min-width: 1024px) {
}
</style>
