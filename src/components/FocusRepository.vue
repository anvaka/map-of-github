<script setup>
import {defineProps, defineEmits, ref} from 'vue';
import {buildLocalNeighborsGraphForGroup} from '../lib/downloadGroupGraph';
import TreeView from './TreeView.vue';

const props = defineProps({
  vm: {
    type: Object,
    required: true
  }
});
const emit = defineEmits(['selected', 'close']);
const expandingGraph = ref(false);
const graphData = ref(null);

function showDetails(repo, event) {
  emit("selected", {
    text: repo.name,
    lon: repo.lngLat[1],
    lat: repo.lngLat[0],
    skipAnimation: event.altKey
  });
}
function closePanel() {
  emit("close");
}

function getLink(repo) {
  return 'https://github.com/' + repo.name;
}

// Convert graph to tree view structure
function toTreeView(graph, startNodeId, depth = 2) {
  const rootGraphNode = graph.getNode(startNodeId);
  if (!rootGraphNode) {
    // Return a minimal tree structure if the start node isn't found
    return { node: { id: startNodeId, name: startNodeId + ' (not found)', isExternal: false, lngLat: null }, children: [] };
  }

  const rootNodeData = {
    id: rootGraphNode.id,
    name: rootGraphNode.data?.name || rootGraphNode.id,
    isExternal: rootGraphNode.data?.isExternal || false,
    lngLat: rootGraphNode.data?.lngLat
  };

  // Helper function to recursively build the tree for children
  // parentNodeId: The ID of the node whose children are being fetched.
  // parentDepthInTree: The depth of parentNodeId in the tree (startNodeId is at 0).
  // path: Set of ancestor IDs in the current traversal path to avoid cycles.
  function getChildrenRecursive(parentNodeId, parentDepthInTree, path) {
    // If the parent node is already at the maximum allowed depth,
    // it cannot have any children displayed in the tree.
    if (parentDepthInTree >= depth) {
      return [];
    }

    const childNodes = [];
    graph.forEachLinkedNode(parentNodeId, (linkedGraphNode) => {
      // If the linked node is already in the current path, skip it to prevent cycles.
      if (path.has(linkedGraphNode.id)) {
        return;
      }

      const childData = {
        id: linkedGraphNode.id,
        name: linkedGraphNode.data?.name || linkedGraphNode.id,
        isExternal: linkedGraphNode.data?.isExternal || false,
        lngLat: linkedGraphNode.data?.lngLat
      };
      
      // Create a new path set for the recursive call, including the current child.
      const newPath = new Set(path);
      newPath.add(linkedGraphNode.id);

      // Recursively get children of the current linkedGraphNode.
      // Its depth in the tree will be parentDepthInTree + 1.
      const grandChildren = getChildrenRecursive(linkedGraphNode.id, parentDepthInTree + 1, newPath);
      
      childNodes.push({ node: childData, children: grandChildren });
    });
    return childNodes;
  }

  // Initial path for recursion, containing only the startNodeId.
  const initialPath = new Set();
  initialPath.add(startNodeId); 
  
  // Fetch children for the root node (startNodeId, which is at depth 0).
  const rootChildren = getChildrenRecursive(startNodeId, 0, initialPath);
  
  return { node: rootNodeData, children: rootChildren };
}

// Handle node selection in the tree view
function handleNodeSelected(node, event) {
  showDetails({
    name: node.name || node.id,
    lngLat: node.lngLat || props.vm.lngLat
  }, event);
}

// Fetch and display expanded graph with neighbors up to specified depth
async function expandGraph() {
  if (expandingGraph.value) return; // Prevent multiple clicks
  
  expandingGraph.value = true;
  try {
    const repositoryName = props.vm.name;
    const groupId = props.vm.groupId;
    
    // Depth of 2 gives immediate neighbors and their neighbors
    const depth = 2;
    
    console.log(`Expanding graph for ${repositoryName} in group ${groupId} with depth ${depth}`);
    const graph = await buildLocalNeighborsGraphForGroup(groupId, repositoryName, depth);

    // Convert graph to tree view
    graphData.value = toTreeView(graph, repositoryName, depth);
    
  } catch (err) {
    console.error('Failed to expand graph:', err);
  } finally {
    expandingGraph.value = false;
  }
}

// Return to direct connections view
function goBackToDirectConnections() {
  graphData.value = null;
}
</script>
<template>
  <div class="neighbors-container">
    <div class="names-container">
      <div class="header-container">
        <div class="header">
          <h2>
            <a :href="getLink(vm.name)" @click.prevent="showDetails(vm, $event)" class="normal">{{ vm.name }}</a> 
          </h2>
          <!-- Graph view header -->
          <div class="minimal-header" v-if="graphData">
            <span>Graph view active.</span>
            <a href="#" 
              @click.prevent="goBackToDirectConnections()" 
              class="inline-action-link"
              :class="{ 'disabled': expandingGraph }">
              Exit
            </a>
          </div>
          
          <!-- Direct connections view header -->
          <div v-else class="minimal-header">
            <span v-if="!vm.loading">
              {{vm.repos.length}} direct connections shown.
              <a href="#" 
                v-if="!expandingGraph"
                @click.prevent="expandGraph()" 
                class="inline-action-link">
                Expand to graph view
              </a>
            </span>
          </div>
        </div>
        <a class='close-btn' href='#' @click.prevent='closePanel()'>
          <!-- Icon copyright (c) 2013-2017 Cole Bemis: https://github.com/feathericons/feather/blob/master/LICENSE -->
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x-circle">
            <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
        </a>
      </div>
  
      <!-- Show either the regular repo list or the expanded graph tree view -->
      <div v-if="!graphData" class="repo-list-container">
        <ul v-if="vm.repos">
          <li v-for="repo in vm.repos" :key="repo.name">
            <a :href="getLink(repo)" @click.prevent="showDetails(repo, $event)" target="_blank">{{repo.name}} <span v-if="repo.isExternal" title="External country">E</span>
            </a>
          </li>
        </ul>
      </div>
      <div v-else class="tree-view-container">
        <TreeView :tree="graphData" @node-selected="handleNodeSelected" />
      </div>
    </div>
  </div>
</template>
<style scoped>
.names-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
h2 {
  margin-bottom: 4px
}

.minimal-header {
  font-size: 14px;
  color: var(--color-text-light, #888);
  margin-bottom: 8px;
}

.inline-action-link {
  color: var(--color-link-hover);
  text-decoration: none;
  margin-left: 5px;
  font-weight: 500;
}

.inline-action-link:hover {
  text-decoration: underline;
}

.inline-action-link.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

ul {
  list-style: none;
  padding: 0;
  overflow-y: auto;
}

.repo-list-container, .tree-view-container {
  overflow-y: auto;
  height: calc(100% - 60px);
}

.chat-container {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--color-border)
}

.close-btn {
  margin: 8px;
}
.header-container {
  display: flex;
}
.header {
  flex: 1;
}

.connections-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.action-button {
  margin-left: 8px;
}

.action-link {
  display: inline-block;
  padding: 4px 10px;
  background: var(--color-background-soft);
  color: var(--color-text);
  text-decoration: none;
  border-radius: 4px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  transition: all 0.3s ease;
}

.action-link:hover {
  color: var(--color-link-hover);
  border-color: var(--color-border-hover);
}

.action-link.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.back-link {
  display: inline-block;
  background: var(--color-background-mute);
  margin-top: 8px;
}

.title-row h3 {
  margin-bottom: 0;
  color: var(--color-text);
}

.graph-controls {
  margin-top: 8px;
  padding: 4px 0;
}
</style>