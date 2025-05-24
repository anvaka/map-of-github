import {createScene} from 'w-gl';
import LineCollection from './gl/LineCollection';
import PointCollection from './gl/PointCollection';
import createLabelManager from './gl/createLabelManager';
import bus from './bus';

export function createSubgraphViewer(subgraphInfo) {
  const container = document.querySelector('.subgraph-viewer');
  if (!container) {
    throw new Error('Subgraph viewer container not found');
  }
  container.classList.add('active');

  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const scene = initScene();
  scene.on('transform', handleTransform);

  let layout = null;
  let graph = subgraphInfo.graph;
  let isDisposed = false;
  let layoutSteps = 400; 
  let nodes, lines, labelManager;
  let rafHandle;
  let lastSelectedNode;
  let selectedNodeColor = 0xbf2072ff; // Selected node color
  let defaultNodeColor = 0x90f8fcff; // Default node color

  canvas.addEventListener('click', handleCanvasClick);
  bus.on('current-project', handleCurrentProjectChange)

  import('ngraph.forcelayout').then(forceLayout => {
    if (!isDisposed) {
      runLayout(forceLayout);
    }
  });

  return {
    dispose() {
      disposeViewer();
    },
    stopLayout() {
      layoutSteps = 0;
    },
    resumeLayout() {
      layoutSteps = 400;
    }
  };
  
  function disposeViewer() {
    if (isDisposed) return;
    
    isDisposed = true;
    cancelAnimationFrame(rafHandle);
    canvas.removeEventListener('click', handleCanvasClick);
    scene.off('transform', handleTransform);
    scene.dispose();
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    container.classList.remove('active');
    bus.off('current-project', handleCurrentProjectChange)
  }

  function handleTransform(transformEvent) {
    const visibleRect = getVisibleRectFromDrawContext(transformEvent.drawContext);
    labelManager.setVisibleRect(visibleRect);
    labelManager.needsRedraw = true;
  }

  function handleCurrentProjectChange(projectName) {
    if (projectName === lastSelectedNode || !layout) {
      return;
    }
    if (!layout.getBody(projectName)) {
      return;
    }

    const pos = layout.getNodePosition(projectName);
    if (typeof scene.flyTo === 'function') {
      scene.flyTo({
        x: pos.x,
        y: pos.y
      })
    } else {
      // old w-gl:
      const padding = 5;
      scene.setViewBox({
        left: pos.x - padding,
        top: pos.y - padding,
        right: pos.x + padding,
        bottom: pos.y + padding,
      });
    }
    selectNode(projectName);
    lastSelectedNode = projectName;
  }

  function initScene() {
    let scene = createScene(canvas);
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
    const rootNode = graph.getNode(subgraphInfo.nodeId);
    layout.pinNode(rootNode, true);
    initUIElements();

    rafHandle = requestAnimationFrame(frame);
  }

  function handleCanvasClick(event) {
    if (!layout || !graph || !canvas) return;
    const [sceneX, sceneY] = scene.getSceneCoordinate(event.clientX, event.clientY);

    let minDistSq = Infinity;
    let nearestNode = null;

    graph.forEachNode(node => {
      if (!layout.getBody(node.id)) return; // Node not in layout yet
      const pos = layout.getNodePosition(node.id);
      
      // Using 2D distance for click interaction
      const dx = pos.x - sceneX;
      const dy = pos.y - sceneY;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearestNode = node;
      }
    });

    if (nearestNode) {
      // Check if the click is within the node's radius
      // node.ui.size is typically diameter. Radius is node.ui.size / 2.
      const nodeRadius = (nearestNode.ui && typeof nearestNode.ui.size === 'number') ? nearestNode.ui.size / 2 : 2.5; // Default radius
      
      if (Math.sqrt(minDistSq) < nodeRadius) {
        selectNode(nearestNode.id);
        const finalPos = layout.getNodePosition(nearestNode.id);
        bus.fire('repo-selected', {
          text: nearestNode.id, // Or nearestNode.data.label if preferred
          x: finalPos.x,
          y: finalPos.y,
          // z: finalPos.z || 0 // include if z-coordinate is relevant
        });
      }
    }
  }

  function selectNode(nodeId) {
    // If we have a previously selected node and it's different from the current one
    if (lastSelectedNode && lastSelectedNode !== nodeId) {
      // Reset the previous selection
      updateNodeAppearance(lastSelectedNode, defaultNodeColor);
      
      // Reset neighbors of previous selection
      graph.forEachLinkedNode(lastSelectedNode, (neighborNode, link) => {
        updateNodeAppearance(neighborNode.id, defaultNodeColor);
        updateLinkAppearance(link, 0xFFFFFF10); // Reset to default edge color
      });
    }

    // Set new selection
    updateNodeAppearance(nodeId, selectedNodeColor);
    
    // Highlight immediate neighbors and connecting edges
    graph.forEachLinkedNode(nodeId, (neighborNode, link) => {
      updateNodeAppearance(neighborNode.id, 0xe56aaaff); // Highlight color for neighbors
      updateLinkAppearance(link, 0xFFFFFFFF); // Bright white for highlighted edges
    });
    
    lastSelectedNode = nodeId;
  }

  // Helper function to update node appearance
  function updateNodeAppearance(nodeId, color) {
    const node = graph.getNode(nodeId);
    if (node && node.ui) {
      node.ui.color = color;
      nodes.update(node.uiId, node.ui);
    }
  }

  // Helper function to update link appearance
  function updateLinkAppearance(link, color) {
    if (link && link.ui) {
      link.ui.color = color;
      lines.update(link.uiId, link.ui);
    }
  }

  function initUIElements() {
    nodes = new PointCollection(scene.getGL(), {
      capacity: Math.max(graph.getNodesCount(), 1000),
    });

    labelManager = createLabelManager(scene);
    labelManager.setVisibleRect(getVisibleRectFromDrawContext(scene.getDrawContext()));
    labelManager.needsRedraw = true;

    graph.forEachNode(node => {
      if (!layout.getBody(node.id)) return; // not yet in layout

      var point = layout.getNodePosition(node.id);
      initializeNodeUI(node, point);
    });

    lines = new LineCollection(scene.getGL(), { capacity: Math.max(graph.getLinksCount(), 1000) });

    graph.forEachLink(link => {
      if (!layout.getBody(link.fromId) || !layout.getBody(link.toId)) return; // not yet in layout
      var from = layout.getNodePosition(link.fromId);
      var to = layout.getNodePosition(link.toId);

      initializeLinkUI(link, from, to);
    });

    scene.appendChild(lines);
    scene.appendChild(nodes);
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
    labelManager.addNodeLabel(node);
  }

  function initializeLinkUI(link, from, to) {
    if (link.ui) return; // already initialized
    let line = { from: [from.x, from.y, from.z || 0], to: [to.x, to.y, to.z || 0], color: 0xFFFFFF10 };
    link.ui = line;
    link.uiId = lines.add(link.ui);
  }

  function frame() {
    rafHandle = requestAnimationFrame(frame);

    let willStop = layoutSteps - 1 === 0;
    if (layoutSteps > 0) {
      layoutSteps -= 1;
      layout.step();
      // Drawing labels is heavy, so avoid it if we don't need it
      labelManager.needsRedraw = true;
    } 
    if (labelManager.needsRedraw) {
      labelManager.redrawLabels();
      labelManager.needsRedraw = false;
    }
    if (willStop) {
      subgraphInfo.onLayoutStatusChange(false);
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

function getVisibleRectFromDrawContext(drawContext) {
    const fov = drawContext.fov;
    const view = drawContext.view;
    const canvasWidth = drawContext.width;
    const canvasHeight = drawContext.height;

    // Calculate visible rectangle at z = 0
    const cameraPos = view.position;
    const cameraZ = cameraPos[2];
    
    // Only calculate if camera is above z = 0 plane
    if (cameraZ > 0) {
      const aspect = canvasWidth / canvasHeight;
      
      // Calculate the height of the visible area at z = 0
      const visibleHeight = 2 * cameraZ * Math.tan(fov / 2);
      const visibleWidth = visibleHeight * aspect;
      
      // Get camera center point (where camera is looking)
      const centerX = view.center[0];
      const centerY = view.center[1];
      
      // Calculate visible rectangle bounds
      const visibleRect = {
        left: centerX - visibleWidth / 2,
        right: centerX + visibleWidth / 2,
        top: centerY + visibleHeight / 2,
        bottom: centerY - visibleHeight / 2,
        width: visibleWidth,
        height: visibleHeight
      };
      return visibleRect;
    }
  }