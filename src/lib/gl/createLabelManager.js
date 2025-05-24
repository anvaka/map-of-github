import MSDFTextCollection from './MSDFTextCollection';

export default function createLabelEditor(scene) {
  const labels = new MSDFTextCollection(scene.getGL());
  scene.appendChild(labels);

  let visibleRect;
  const allLabelsInfo = new Map();
  let visibleLabels = new Set();

  return {
    addNodeLabel(node) {
      if (allLabelsInfo.has(node.id)) {
        console.warn('Label with this ID already exists');
        return;
      }
      allLabelsInfo.set(node.id, node);
      labels.addText(getTextFromNode(node));
    },
    redrawLabels,
    setVisibleRect(rect) {
      visibleRect = {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom
      };
      updateVisibleLabels();
    },
    dispose
  };

  function redrawLabels() {
    labels.clear();
    visibleLabels.forEach(labelInfo => {
      labels.addText(getTextFromNode(labelInfo));
    });
  }

  function dispose() {
    labels.dispose();
    allLabelsInfo.clear();
  }

  function updateVisibleLabels() {
    if (!visibleRect) return;

    visibleLabels.clear();
    allLabelsInfo.forEach(labelInfo => {
      if (isLabelVisible(labelInfo)) {
        visibleLabels.add(labelInfo);
      }
    });
  }

  function isLabelVisible(labelInfo) {
    const [ x, y ] = labelInfo.ui.position;
    return (
      x > visibleRect.left &&
      x < visibleRect.right &&
      y < visibleRect.top &&
      y > visibleRect.bottom
    );
  }
}

function getTextFromNode(node) {
  return {
    text: '' + ((node.data && node.data.label) || node.id),
    x: node.ui.position[0],
    y: node.ui.position[1] - node.ui.size / 2,
    limit: node.ui.size,
    cx: 0.5
  };
}