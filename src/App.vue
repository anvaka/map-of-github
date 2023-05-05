<script setup>
import {ref, onBeforeUnmount, onBeforeMount} from 'vue';
import TypeAhead from './components/TypeAhead.vue';
import GithubRepository from './components/GithubRepository.vue';
import bus from './lib/bus'

import createMap from './lib/createMap';

let mapOwner = createMap();

let sidebarVisible = ref(false);
let currentProject = ref(''); 
let tooltip = ref(null);
let contextMenu = ref(null);
let lastSelected;

function onTypeAheadInput() {
}

function closeSideBarViewer() {
  sidebarVisible.value = false;
  currentProject.value = '';
  mapOwner.clearHighlights();
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
  const location = {
    center: [x.lat, x.lon],
    zoom: 12,
  }
  mapOwner.makeVisible(x.text, location);
  currentProject.value = x.text;
}

function onRepoSelected(repo) {
  lastSelected = repo;
  currentProject.value = repo.text;
}

function onShowTooltip(newTooltip) {
  tooltip.value = newTooltip;
}

function onShowContextMenu(newContextMenu) {
  contextMenu.value = newContextMenu;
}

onBeforeUnmount(() => {
  if (mapOwner) {
    mapOwner.dispose();
  }
  bus.off('repo-selected', onRepoSelected);
  bus.off('show-tooltip', onShowTooltip);
  bus.off('show-context-menu', onShowContextMenu);
})

onBeforeMount(() => {
  bus.on('repo-selected', onRepoSelected);
  bus.on('show-context-menu', onShowContextMenu);
  bus.on('show-tooltip', onShowTooltip);
});

function doContextMenuAction(menuItem) {
  contextMenu.value = null;
  menuItem.click();
}

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
    <div class="tooltip" v-if="tooltip" :style="{left: tooltip.left, top: tooltip.top, background: tooltip.background}">{{ tooltip.text }}</div>
    <div class="context-menu" v-if="contextMenu" :style="{left: contextMenu.left, top: contextMenu.top}">
      <a href="#" v-for="(item, key) in contextMenu.items" :key="key" @click.prevent="doContextMenuAction(item)">{{ item.text }}</a>
    </div>
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
.tooltip {
  position: absolute;
  background: var(--color-background-soft);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  color: var(--color-text);
  z-index: 1;
  pointer-events: none;
  white-space: nowrap;
  transform: translate(-50%, calc(-100% - 12px));
}

.context-menu {
  position: absolute;
  background: var(--color-background-soft);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  color: var(--color-text);
  z-index: 2;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
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
