<script setup>
import {ref, onBeforeUnmount, onBeforeMount, computed} from 'vue';
import TypeAhead from './components/TypeAhead.vue';
import GithubRepository from './components/GithubRepository.vue';
import SmallPreview from './components/SmallPreview.vue';
import About from './components/About.vue';
import UnsavedChanges from './components/UnsavedChanges.vue';
import LargestRepositories from './components/LargestRepositories.vue';
import FocusRepository from './components/FocusRepository.vue';
import GroupViewModel from './lib/GroupViewModel';
import FocusViewModel from './lib/FocusViewModel';

import bus from './lib/bus'

const SM_SCREEN_BREAKPOINT = 600;

const sidebarVisible = ref(false);
const currentProject = ref(''); 
const smallPreviewName = ref('');
const tooltip = ref(null);
const contextMenu = ref(null);
const aboutVisible = ref(false);
const currentGroup = ref(null);
const currentFocus = ref(null);
const unsavedChangesVisible = ref(false);
const hasUnsavedChanges = ref(false);
const isSmallScreen = ref(window.innerWidth < SM_SCREEN_BREAKPOINT)
let lastSelected;

function onTypeAheadInput() {
}

const groupCache = new Map();

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
  window.mapOwner?.makeVisible(x.text, location, x.skipAnimation);
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
  bus.off('show-largest-in-group', onShowLargestInGroup);
  bus.off('focus-on-repo', onFocusOnRepo);
  bus.off('unsaved-changes-detected', onUnsavedChangesDetected);
  window.removeEventListener('resize', onResize);
})

onBeforeMount(() => {
  bus.on('repo-selected', onRepoSelected);
  bus.on('show-context-menu', onShowContextMenu);
  bus.on('show-tooltip', onShowTooltip);
  bus.on('show-largest-in-group', onShowLargestInGroup);
  bus.on('focus-on-repo', onFocusOnRepo);
  bus.on('unsaved-changes-detected', onUnsavedChangesDetected);
  window.addEventListener('resize', onResize);
});

function onResize() {
  isSmallScreen.value = window.innerWidth < SM_SCREEN_BREAKPOINT;
}

function doContextMenuAction(menuItem) {
  contextMenu.value = null;
  menuItem.click();
}

function onFocusOnRepo(repo, groupId) {
  const focusViewModel = new FocusViewModel(repo, groupId);
  currentGroup.value = null;
  currentFocus.value = focusViewModel;
}

function onShowLargestInGroup(groupId, largest) {
  let groupViewModel = groupCache.get(groupId);
  if (!groupViewModel) {
    groupViewModel = new GroupViewModel(groupId);
    groupCache.set(groupId, groupViewModel);
  }
  groupViewModel.setLargest(largest);
  currentFocus.value = null;
  currentGroup.value = groupViewModel;
}

function onUnsavedChangesDetected(hasChanges) {
  hasUnsavedChanges.value = hasChanges;
}

function closeLargestRepositories() {
  currentGroup.value = null
  window.mapOwner?.clearBorderHighlights();
}

function closeFocusView() {
  currentFocus.value = null;
}

const typeAheadVisible = computed(() => {
  return !(isSmallScreen.value && currentGroup.value && !currentProject.value);
});

function showUnsavedChanges() {
  unsavedChangesVisible.value = true;
}

async function listCurrentConnections() {
  let groupId = await window.mapOwner?.getGroupIdAt(lastSelected.lat, lastSelected.lon);
  if (groupId !== undefined) {
    const focusViewModel = new FocusViewModel(lastSelected.text, groupId);
    currentGroup.value = null;
    currentFocus.value = focusViewModel;
  }
}

</script>

<template>
  <div>
    <div class="unsaved-changes" v-if='hasUnsavedChanges'>
      You have unsaved labels in local storage. <a href="#" @click.prevent="showUnsavedChanges()" class="normal">Click here</a> to see them.
    </div>
    <div class="made-by">
      Made by
      <a class="normal" aria-label="Made by @anvaka" target="_blank" href="https://github.com/sponsors/anvaka">
        @anvaka
      </a>
    </div>
    <largest-repositories :repos="currentGroup" v-if="currentGroup"
      class="right-panel"
      @selected="findProject"
      @close="closeLargestRepositories()"
    ></largest-repositories>
    <focus-repository :vm="currentFocus" v-if="currentFocus"
      class="right-panel"
      @selected="findProject"
      @close="closeFocusView()"
    ></focus-repository>
    <github-repository :name="currentProject" v-if="currentProject" @listConnections="listCurrentConnections()"></github-repository>
    <form @submit.prevent="onSubmit" class="search-box" v-if="typeAheadVisible">
      <type-ahead
        placeholder="Find Project"
        @menuClicked='aboutVisible = true'
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
    <transition name='slide-top'>
      <unsaved-changes v-if='unsavedChangesVisible' @close='unsavedChangesVisible = false' class='changes-window'></unsaved-changes>
    </transition>
    <transition name='slide-left'>
      <about v-if="aboutVisible" @close='aboutVisible = false' class="about"></about>
    </transition>
  </div>
</template>

<style scoped>
.made-by {
  position: fixed;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  font-size: 12px;
  color: #fff;
}
.made-by a {
  color: hsla(160, 100%, 37%, 1);
}

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

.right-panel {
  position: fixed;
  right: 0;
  padding: 8px;
  background: var(--color-background);
  height: 100%;
  bottom: 0;
  width: 400px;
  overflow: hidden;
  border-left: 1px solid var(--color-border);
}
.unsaved-changes {
  position: absolute;
  top: 60px;
  left: 8px;
  padding: 8px;
  font-size: 12px;
  color: var(--color-text);
  background: var(--color-background);
  width: calc(var(--side-panel-width) - 8px);
}

.slide-top-enter-active, .slide-top-leave-active {
  transition: opacity .3s cubic-bezier(0,0,0.58,1);
}
.slide-top-enter, .slide-top-leave-to {
  opacity: 0;
}
.changes-window {
  position: fixed;
  transform: translate(-50%, -50%);
  top: 0;
  left: 50%;
  top: 50%;
  width: 400px;
  background: var(--color-background);
  z-index: 2;
  box-shadow: 0 -1px 24px rgb(0 0 0);
  padding: 8px 16px;
  overflow-y: auto;
  max-height: 100%;
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
.slide-left-enter-active, .slide-left-leave-active {
  transition: transform 150ms cubic-bezier(0,0,0.58,1);
}
.slide-left-enter, .slide-left-leave-to {
  transform: translateX(-100%);
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
.about {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--side-panel-width);
  background: var(--color-background);
  z-index: 2;
  box-shadow: 0 -1px 24px rgb(0 0 0);
  display: flex;
  flex-direction: column;
}


@media (max-width: 800px) {
  .repo-viewer, .search-box, .right-panel {
    width: 45vw;
  }
  .search-box {
    margin: 0;
    left: 0;
  }
  .unsaved-changes {
    width: 45vw;
    left: 0;
    top: 48px
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
  .right-panel {
    width: 100%;
  }
  .neighbors-container {
    height: 30%;
    top: 70%;
    z-index: 2;
    border-top: 1px solid var(--color-border);
    box-shadow: 0 -4px 4px rgba(0,0,0,0.42);
  }
}

</style>
