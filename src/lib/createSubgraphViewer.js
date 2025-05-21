import {createScene} from 'w-gl';
import LineCollection from './gl/LineCollection';
import PointCollection from './gl/PointCollection';
import MSDFTextCollection from './gl/MSDFTextCollection';

export function createSubgraphViewer(subgraphInfo) {
  const container = document.querySelector('.subgraph-viewer');
  if (!container) {
    throw new Error('Subgraph viewer container not found');
  }
  container.classList.add('active');

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  container.appendChild(canvas);
  const scene = initScene();
  let layout = null;
  let graph = subgraphInfo.graph;
  let isDisposed = false;
  let layoutSteps = 4000; 
  let nodes, lines, labels;
  let rafHandle;
  // TODO: do not run if we already disposed.
  import('ngraph.forcelayout').then(runLayout);

  return {
    dispose() {
      if (isDisposed) throw new Error('Already disposed');
      isDisposed = true;
      cancelAnimationFrame(rafHandle);
      // Clean up the canvas and any other resources
      scene.dispose();
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      container.classList.remove('active');
    }
  };

  function initScene() {
    let scene = createScene(canvas, {
      devicePixelRatio: 1
    });
    scene.setClearColor(12/255, 41/255, 82/255, 1)
    let initialSceneSize = 40;
    scene.setViewBox({
      left:  -initialSceneSize,
      top:   -initialSceneSize,
      right:  initialSceneSize,
      bottom: initialSceneSize,
    });

    return scene;
  }

  function runLayout(forceLayout) {
    if (isDisposed) return;
    layout = forceLayout.default(graph, {
      timeStep: 0.5,
      springLength: 10,
      springCoefficient: 0.8,
      gravity: -12,
      dragCoefficient: 0.9,
    });
    layout.step();
    initUIElements();

    rafHandle = requestAnimationFrame(frame);
  }

  function initUIElements() {
    nodes = new PointCollection(scene.getGL(), {
      capacity: Math.min(graph.getNodesCount(), 1000),
    });

    graph.forEachNode(node => {
      if (!layout.getBody(node.id)) return; // not yet in layout

      var point = layout.getNodePosition(node.id);
      initializeNodeUI(node, point);
    });

    lines = new LineCollection(scene.getGL(), { capacity: Math.min(graph.getLinksCount(), 1000) });

    graph.forEachLink(link => {
      if (!layout.getBody(link.fromId) || !layout.getBody(link.toId)) return; // not yet in layout
      var from = layout.getNodePosition(link.fromId);
      var to = layout.getNodePosition(link.toId);

      initializeLinkUI(link, from, to);
    });

    scene.appendChild(lines);
    scene.appendChild(nodes);
    labels = new MSDFTextCollection(scene.getGL());
    redrawLabels();
    scene.appendChild(labels);
  }

  function initializeNodeUI(node, point) {
    if (node.ui) return; // already initialized

    let size = 1;
    if (node.data && node.data.size) {
      size = node.data.size;
    } else {
      if (!node.data) node.data = {};
      node.data.size = size;
    }
    node.ui = {size, position: [point.x, point.y, point.z || 0], color: node.data.color || 0x90f8fcff};
    node.uiId = nodes.add(node.ui);
  }

  function initializeLinkUI(link, from, to) {
    if (link.ui) return; // already initialized
    let line = { from: [from.x, from.y, from.z || 0], to: [to.x, to.y, to.z || 0], color: 0xFFFFFF10 };
    link.ui = line;
    link.uiId = lines.add(link.ui);
  }

  function redrawLabels() {
    labels.clear();
    graph.forEachNode(node => {
      if (!node.ui) return; // not yet in layout

      const text = '' + ((node.data && node.data.label) || node.id);

      labels.addText({
        text,
        x: node.ui.position[0],
        y: node.ui.position[1] - node.ui.size / 2,
        limit: node.ui.size,
        cx: 0.5
      });
    });
  }

  function frame() {
    rafHandle = requestAnimationFrame(frame);

    if (layoutSteps > 0) {
      layoutSteps -= 1;
      layout.step();
      // Drawing labels is heavy, so avoid it if we don't need it
      redrawLabels();
    }
    drawGraph();
    scene.renderFrame();
  }

  function drawGraph() {
    graph.forEachNode(node => {
      if (layout.getBody(node.id) === undefined) {
        // not yet in layout
        return;
      }

      let pos = layout.getNodePosition(node.id);
      if (node.ui) {
        let uiPosition = node.ui.position;
        uiPosition[0] = pos.x;
        uiPosition[1] = pos.y;
        uiPosition[2] = pos.z || 0;
        nodes.update(node.uiId, node.ui)
      } else {
        initializeNodeUI(node, pos);
      }
    });

    graph.forEachLink(link => {
      if (layout.getBody(link.fromId) === undefined || layout.getBody(link.toId) === undefined) {
        // not yet in layout
        return;
      }
      let fromPos = layout.getNodePosition(link.fromId);
      let toPos = layout.getNodePosition(link.toId);
      if (link.ui) {
        let {from, to} = link.ui;
        from[0] = fromPos.x; from[1] = fromPos.y; from[2] = fromPos.z || 0;
        to[0] = toPos.x; to[1] = toPos.y; to[2] = toPos.z || 0;
        lines.update(link.uiId, link.ui);
      } else {
        initializeLinkUI(link, fromPos, toPos);
      }
    })
  }

}