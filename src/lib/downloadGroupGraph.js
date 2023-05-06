// import createGraph from 'ngraph.graph';
import config from './config';

const graphsCache = new Map();

export default async function downloadGroupGraph(groupId) {
  if (graphsCache.has(groupId)) {
    return graphsCache.get(groupId);
  }
  // let graph = createGraph();

  let response = await fetch(`${config.graphsEndpoint}/${groupId}.graph.dot`);
  let text = await response.text();

  let fromDot = await import('ngraph.fromdot');
  let graph = fromDot.default(text);
  graph.forEachNode(node => {
    node.data.l = node.data.l.split(',').map(x => +x);
  })
  // let nodeFetch = fetch(`${config.graphsEndpoint}/${groupId}.nodes.json`).then(r => r.json()).then(nodePositions => {
  //   let nodeId = 0;
  //   for (let i = 0; i < nodePositions.length; i += 2) {
  //     nodeId += 1;
  //     graph.addNode(nodeId, [nodePositions[i], nodePositions[i + 1]]);
  //   }
  // });
  // let linkFetch = fetch(`${config.graphsEndpoint}/${groupId}.links.bin`).then(r => r.arrayBuffer()).then(buffer => {
  //   // buffer is int32 array:
  //   let view = new Int32Array(buffer);
  //   let lastFrom = 0;
  //   for (let i = 0; i < view.length; i++) {
  //     let v = view[i];
  //     if (v < 0) {
  //       // new source node
  //       lastFrom = -v;
  //       continue;
  //     }
  //     graph.addLink(lastFrom, v);
  //   }
  // });
  // await Promise.all([nodeFetch, linkFetch]);
  graphsCache.set(groupId, graph);
  return graph;
}