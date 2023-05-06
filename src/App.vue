<script setup>
import {ref, onBeforeUnmount, onBeforeMount, computed} from 'vue';
import TypeAhead from './components/TypeAhead.vue';
import GithubRepository from './components/GithubRepository.vue';
import SmallPreview from './components/SmallPreview.vue';
import LargestRepositories from './components/LargestRepositories.vue';
import bus from './lib/bus'

const SM_SCREEN_BREAKPOINT = 600;

const sidebarVisible = ref(false);
const currentProject = ref(''); 
const smallPreviewName = ref('');
const tooltip = ref(null);
const contextMenu = ref(null);
const largestRepositoriesList = ref(null);
const isSmallScreen = ref(window.innerWidth < SM_SCREEN_BREAKPOINT)
let lastSelected;

function onTypeAheadInput() {
}

function closeSideBarViewer() {
  sidebarVisible.value = false;
  currentProject.value = '';
  smallPreviewName.value = '';
  window.mapOwner?.clearHighlights();
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
  window.mapOwner?.makeVisible(x.text, location);
  currentProject.value = x.text;
}

function onRepoSelected(repo) {
  lastSelected = repo;
  if (isSmallScreen.value) {
    // move panel to the bottom
    smallPreviewName.value = repo.text;
    currentProject.value = null;
  } else {
    currentProject.value = repo.text;
  }
}

function showFullPreview() {
  smallPreviewName.value = null;
  currentProject.value = lastSelected.text;
}

function onShowTooltip(newTooltip) {
  tooltip.value = newTooltip;
}

function onShowContextMenu(newContextMenu) {
  contextMenu.value = newContextMenu;
}

onBeforeUnmount(() => {
  window.mapOwner?.dispose();
  bus.off('repo-selected', onRepoSelected);
  bus.off('show-tooltip', onShowTooltip);
  bus.off('show-context-menu', onShowContextMenu);
  bus.off('show-largest', onShowLargest);
  window.removeEventListener('resize', onResize);
})

onBeforeMount(() => {
  bus.on('repo-selected', onRepoSelected);
  bus.on('show-context-menu', onShowContextMenu);
  bus.on('show-tooltip', onShowTooltip);
  bus.on('show-largest', onShowLargest);
  window.addEventListener('resize', onResize);
});

function onResize() {
  isSmallScreen.value = window.innerWidth < SM_SCREEN_BREAKPOINT;
}

function doContextMenuAction(menuItem) {
  contextMenu.value = null;
  menuItem.click();
}


function onShowLargest(largest) {
  largestRepositoriesList.value = largest;
}

const typeAheadVisible = computed(() => {
  return !(isSmallScreen.value && largestRepositoriesList.value && !currentProject.value);
});

</script>

<template>
  <div>
    <largest-repositories :repos="largestRepositoriesList" v-if="largestRepositoriesList"
      class="largest-repositories"
      @selected="findProject"
      @close="largestRepositoriesList = null"
    ></largest-repositories>
    <github-repository :name="currentProject" v-if="currentProject"></github-repository>
    <form @submit.prevent="onSubmit" class="search-box" v-if="typeAheadVisible">
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
    <transition name='slide-bottom'>
      <small-preview v-if="smallPreviewName" :name="smallPreviewName" class="small-preview" @showFullPreview="showFullPreview()"></small-preview>
    </transition>
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
  width: calc(var(--side-panel-width) - 8px);
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

.largest-repositories {
  position: fixed;
  right: 0;
  padding: 8px;
  background: var(--color-background);
  height: 100%;
  bottom: 0;
  width: 400px;
  overflow: hidden;
  border-left: 1px solid var(--color-border);
  display: grid;
  grid-template-rows: minmax(0, 40%) minmax(0, 60%);
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
.slide-bottom-enter-active, .slide-bottom-leave-active {
  transition: transform .3s cubic-bezier(0,0,0.58,1);
}
.slide-bottom-enter, .slide-bottom-leave-to {
  transform: translateY(84px);
}
.small-preview {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 84px;
  background: var(--color-background);
  box-shadow: 0 -4px 4px rgba(0,0,0,0.42);
}

@media (max-width: 800px) {
  .repo-viewer, .search-box, .largest-repositories {
    width: 45vw;
  }
}
@media (max-width: 600px) {
  .repo-viewer {
    width: 100%;
  }
  .search-box {
    left: 0;
    margin-top: 0;
    width: 100%;
  }
  .largest-repositories {
    width: 100%;
  }
}

</style>
