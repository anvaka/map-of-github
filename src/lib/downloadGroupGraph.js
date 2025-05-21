import config from './config';
import bus from './bus';

const graphsCache = new Map();
const pendingRequests = new Map();

export default async function downloadGroupGraph(groupId) {
  if (graphsCache.has(groupId)) {
    return graphsCache.get(groupId);
  }

  // Prevent duplicate network requests by returning the in-flight promise
  if (pendingRequests.has(groupId)) {
    return pendingRequests.get(groupId);
  }

  const promise = fetchAndProcessGraph(groupId);
  pendingRequests.set(groupId, promise);
  
  try {
    const graph = await promise;
    graphsCache.set(groupId, graph);
    return graph;
  } finally {
    // Always clean up to prevent memory leaks, even on errors
    pendingRequests.delete(groupId);
  }
}

async function fetchAndProcessGraph(groupId) {
  let response = await fetch(`${config.graphsEndpoint}/${groupId}.graph.dot`);
  let text = await response.text();

  let fromDot = await import('ngraph.fromdot');
  let graph = fromDot.default(text);
  graph.forEachNode(node => {
    node.data.l = node.data.l.split(',').map(x => +x);
    if (node.data.c === undefined) {
      // Nodes of external groups will have their groupId set in the `.data.c` property
      // However nodes that belong to current group will have this property set to undefined
      // We set it here to make sure we know which group the node belongs to
      node.data.c = groupId;
    }
  });

  return graph;
}

export async function buildLocalNeighborsGraphForGroup(groupId, repositoryName, depth) {
  const createGraph = await import('ngraph.graph');
  const localGraph = createGraph.default();
  // Fetch the initial group's graph
  const rootGraph = await downloadGroupGraph(groupId);
  
  // Track visited nodes to avoid duplicates
  const visited = new Set();
  // Queue for BFS traversal with node id, source group, and current depth
  const queue = [];
  
  // Get the starting node
  const startNode = rootGraph.getNode(repositoryName);
  if (!startNode) return localGraph; // Repository not found

  const subgraphLoadEventArgs = {
    graph: localGraph,
    nodeId: startNode.id,
    groupId: groupId,
    callWhenDone: Function.prototype
  };
  bus.fire('subgraph-load-started', subgraphLoadEventArgs);

  // Add starting node to local graph and queue
  localGraph.addNode(startNode.id, { ...startNode.data });
  queue.push({ nodeId: startNode.id, groupId, currentDepth: 0 });
  visited.add(startNode.id);
  
  // BFS traversal up to specified depth
  while (queue.length > 0) {
    const { nodeId, groupId: currentGroupId, currentDepth } = queue.shift();
    
    if (currentDepth >= depth) continue;
    
    // Get the graph for the current group
    const currentGraph = await downloadGroupGraph(currentGroupId);
    
    // Process all neighbors of the current node
    currentGraph.forEachLinkedNode(nodeId, (neighborNode, link) => {
      // Add the edge to the local graph
      if (!localGraph.hasLink(link.fromId, link.toId)) {
        localGraph.addLink(link.fromId, link.toId, { ...link.data });
      }
      
      // Skip already visited nodes
      if (visited.has(neighborNode.id)) return;
      
      // Add the neighbor node to the local graph
      localGraph.addNode(neighborNode.id, { ...neighborNode.data });
      visited.add(neighborNode.id);
      
      // Add neighbor to queue with its group and incremented depth
      const neighborGroupId = neighborNode.data.c;
      queue.push({ 
        nodeId: neighborNode.id, 
        groupId: neighborGroupId, 
        currentDepth: currentDepth + 1 
      });
    });
  }

  subgraphLoadEventArgs.callWhenDone();

  return localGraph;
}