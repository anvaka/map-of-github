import { ref } from 'vue';
import { buildLocalNeighborsGraphForGroup } from './downloadGroupGraph';
import downloadGroupGraph from './downloadGroupGraph';
import { createSubgraphViewer } from './createSubgraphViewer';

// Static reference to maintain single instance
let activeSubgraphViewer = null;

/**
 * This view model is used to show direct neighbors of a node. It can be extended
 * to pull second layer neighbors as well and then perform layout on them.
 */
export default class FocusViewModel {
  constructor(repositoryName, groupId) {
    this.name = repositoryName;
    this.groupId = groupId;
    this.repos = ref([]);
    this.lngLat = ref(null);
    this.loading = ref(true);
    this.expandingGraph = ref(false);
    this.graphData = ref(null);
    this.layoutRunning = ref(false);

    downloadGroupGraph(groupId).then(graph => {
      this.loading.value = false;
      let neighbors = [];
      this.lngLat.value = graph.getNode(repositoryName)?.data.l;
      let seen = new Set();
      graph.forEachLinkedNode(repositoryName, (node, link) => {
        if (seen.has(node.id)) {
          return;
        }
        seen.add(node.id);
        neighbors.push({
          name: node.id,
          lngLat: node.data.l,
          isExternal: !!(link.data?.e)
        });
      });

      neighbors.sort((a, b) => {
        if (a.isExternal && !b.isExternal) {
          return 1;
        } else if (!a.isExternal && b.isExternal) {
          return -1;
        } else {
          return 0;
        }
      });

      this.repos.value = neighbors;
    });
  }

  // Return to direct connections view
  goBackToDirectConnections() {
    this.graphData = null;
    this.disposeSubgraphViewer();
  }

  // Dispose subgraph viewer if it exists
  disposeSubgraphViewer() {
    if (activeSubgraphViewer) {
      activeSubgraphViewer.dispose();
      activeSubgraphViewer = null;
    }
  }
  
  // Clean up resources when this view model is destroyed
  dispose() {
    this.disposeSubgraphViewer();
  }

  setLayout(isRunning) {
    if (!activeSubgraphViewer) return;

    if (isRunning) {
      activeSubgraphViewer.resumeLayout();
    } else {
      activeSubgraphViewer.stopLayout();
    }

    this.layoutRunning = isRunning;
  }

  // Fetch and display expanded graph with neighbors up to specified depth
  async expandGraph() {
    if (this.expandingGraph) return; // Prevent multiple clicks

    this.expandingGraph = true;
    try {
      const repositoryName = this.name;
      const groupId = this.groupId;

      // Depth of 2 gives immediate neighbors and their neighbors
      const depth = 2;

      const graph = await buildLocalNeighborsGraphForGroup(groupId, repositoryName, depth);

      // Convert graph to tree view
      this.graphData = toTreeView(graph, repositoryName, depth);

      // Dispose existing viewer if any
      this.disposeSubgraphViewer();
      
      // Create the new subgraph viewer
      activeSubgraphViewer = createSubgraphViewer({
        graph,
        nodeId: repositoryName,
        groupId,
        onLayoutStatusChange: (isRunning) => {
          this.layoutRunning = isRunning;
        }
      });
      
      // Set initial layout status
      this.layoutRunning = true;

    } catch (err) {
      console.error('Failed to expand graph:', err);
    } finally {
      this.expandingGraph = false;
    }
  }
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
