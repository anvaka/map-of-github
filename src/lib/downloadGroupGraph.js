import config from './config';

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
  });

  return graph;
}