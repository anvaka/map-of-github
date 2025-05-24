import MSDFTextCollection from './MSDFTextCollection';

export default function createLabelEditor(scene) {
  let isFontReady = false;
  const labels = new MSDFTextCollection(scene.getGL(), {
    onReady: () => {
      isFontReady = true;
      updateVisibleLabels();
    }
  });
  scene.appendChild(labels);

  let visibleRect;
  const allLabelsInfo = new Map();
  let visibleLabels = new Set();
  let scheduledVisibleLabelsUpdate = false;
  const padding = 1; // Padding around labels for overlap checking

  return {
    addNodeLabel(node) {
      if (allLabelsInfo.has(node.id)) return;
      allLabelsInfo.set(node.id, node);
      updateVisibleLabels();
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
    updateVisibleLabels,
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
    if (!scheduledVisibleLabelsUpdate) {
      scheduledVisibleLabelsUpdate = requestAnimationFrame(updateVisibleLabelsForReal);
    }
  }

  function updateVisibleLabelsForReal() {
    scheduledVisibleLabelsUpdate = 0;
    if (!visibleRect || !isFontReady) return;

    const potentiallyVisible = [];
    allLabelsInfo.forEach(labelInfo => {
      if (isLabelVisible(labelInfo)) {
        const textLayout = labels.measureText(getTextFromNode(labelInfo));
        if (textLayout && !textLayout.error) {
          potentiallyVisible.push({
            ...labelInfo,
            textLayout // Store layout info
          });
        }
      }
    });

    // Sort by selected status first (root=0, neighbor=1, unselected=negative), then by size (descending), then by x coordinate (ascending) as a tie-breaker
    potentiallyVisible.sort((a, b) => {
      const selectedLevelA = a.selectedLevel !== undefined ? a.selectedLevel : -1;
      const selectedLevelB = b.selectedLevel !== undefined ? b.selectedLevel : -1;
      
      // Priority: root (0) > neighbors (1) > unselected (negative)
      const priorityA = selectedLevelA >= 0 ? (selectedLevelA === 0 ? 2 : 1) : 0; // root=2, neighbor=1, unselected=0
      const priorityB = selectedLevelB >= 0 ? (selectedLevelB === 0 ? 2 : 1) : 0;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority comes first
      }
      
      const sizeA = a.ui && a.ui.size !== undefined ? a.ui.size : 0;
      const sizeB = b.ui && b.ui.size !== undefined ? b.ui.size : 0;
      if (sizeB !== sizeA) {
        return sizeB - sizeA;
      }
      return (a.textLayout ? a.textLayout.x : 0) - (b.textLayout ? b.textLayout.x : 0);
    });

    visibleLabels.clear();
    const renderedLabels = [];

    for (const labelInfo of potentiallyVisible) {
      if (!isOverlapping(labelInfo, renderedLabels)) {
        visibleLabels.add(labelInfo); // Add the original labelInfo, not the one with textLayout
        renderedLabels.push(labelInfo); // Store for overlap checks
      }
    }

    redrawLabels(); // Redraw with the new set of visible, non-overlapping labels
  }

  function isOverlapping(labelInfo, existingLabels) {
    if (!labelInfo.textLayout) return false; // Should not happen if logic is correct

    const rect1 = {
      left: labelInfo.textLayout.x - padding,
      right: labelInfo.textLayout.x + labelInfo.textLayout.width + padding,
      top: labelInfo.textLayout.y + labelInfo.textLayout.height + padding, // y is usually top, height goes down
      bottom: labelInfo.textLayout.y - padding
    };
    
    // Adjust for y being baseline and height extending upwards from baseline
    // The measureText returns y as the bottom-left of the bounding box.
    // So top is y + height.
    rect1.top = labelInfo.textLayout.y + labelInfo.textLayout.height + padding;
    rect1.bottom = labelInfo.textLayout.y - padding;


    for (const existingLabel of existingLabels) {
      if (!existingLabel.textLayout) continue;

      const rect2 = {
        left: existingLabel.textLayout.x - padding,
        right: existingLabel.textLayout.x + existingLabel.textLayout.width + padding,
        top: existingLabel.textLayout.y + existingLabel.textLayout.height + padding,
        bottom: existingLabel.textLayout.y - padding
      };

      // Check for overlap
      if (rect1.left < rect2.right &&
          rect1.right > rect2.left &&
          rect1.bottom < rect2.top && // In screen coordinates, top is smaller y
          rect1.top > rect2.bottom) {
        return true; // Overlap detected
      }
    }
    return false; // No overlap
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
  if (!node.textUI) {
    node.textUI = {
      text: '',
      fontSize: 16,
      x: 0,
      y: 0,
      cx: 0.5
    }
  }

  let text = '' + ((node.data && node.data.label) || node.id);
  let fontSize = 16;
  if (!node.isSelected && text.indexOf('/') > -1) {
    text = text.split('/').pop();
    fontSize = 14
  }
  node.textUI.text = text;
  node.textUI.fontSize = fontSize;
  node.textUI.x = node.ui.position[0];
  node.textUI.y = node.ui.position[1] - node.ui.size / 2;
  return node.textUI;
}