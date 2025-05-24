import MSDFTextCollection from './MSDFTextCollection';

export default function createLabelEditor(scene) {
  const labels = new MSDFTextCollection(scene.getGL());
  scene.appendChild(labels);

  let visibleRect;
  const allLabelsInfo = new Map();
  let visibleLabels = new Set();
  let scheduledVisibleLabelsUpdate = false;

  return {
    addNodeLabel(node) {
      if (allLabelsInfo.has(node.id)) return;
      allLabelsInfo.set(node.id, node);
      labels.addText(getTextFromNode(node));
      if (!scheduledVisibleLabelsUpdate) {
        scheduledVisibleLabelsUpdate = requestAnimationFrame(updateVisibleLabels);
      }
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
    scheduledVisibleLabelsUpdate = 0;
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
  let text = '' + ((node.data && node.data.label) || node.id);
  if (!node.isSelected && text.indexOf('/') > -1) {
    text = text.split('/').pop();
  }
  return {
    text: text,
    x: node.ui.position[0],
    y: node.ui.position[1] - node.ui.size / 2,
    cx: 0.5
  };
}