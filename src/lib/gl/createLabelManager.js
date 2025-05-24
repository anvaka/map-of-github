import MSDFTextCollection from './MSDFTextCollection';

export default function createLabelEditor(scene) {
  let isFontReady = false;
  const labels = new MSDFTextCollection(scene.getGL(), {
    onReady: () => {
      isFontReady = true;
      updateVisibleLabels();
    }
  });

  let visibleRect;
  const allLabelsInfo = new Map();
  let visibleLabels = new Set();
  let scheduledVisibleLabelsUpdate = false;
  let cameraZ = scene.getDrawContext().view.position[2];
  const padding = 1; // Padding around labels for overlap checking

  return {
    labels,
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
      cameraZ = scene.getDrawContext().view.position[2]
      updateVisibleLabels();
    },
    updateVisibleLabels,
    dispose
  };

  function redrawLabels() {
    labels.clear();
    visibleLabels.forEach(labelInfo => {
      labels.addText(getTextFromNode(labelInfo, cameraZ));
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
        const textLayout = labels.measureText(getTextFromNode(labelInfo, cameraZ));
        if (!textLayout || textLayout.error) {
          // If text layout measurement failed, skip this label
          return;
        }
        if (textLayout.width > 10 && labelInfo.selectedLevel < 0) {
          // Too long to display, skip
          return;
        }
        if (textLayout && !textLayout.error) {
          labelInfo.textLayout = textLayout; // Store layout info
          potentiallyVisible.push(labelInfo);
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

function getTextFromNode(node, cameraZ) {
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
  
  if (node.selectedLevel !== 0 && text.indexOf('/') > -1) {
    text = text.split('/').pop();
  }

  // For non-selected labels, apply fontSize scaling based on camera z position and node size
  if (node.selectedLevel < 0) {
    const nodeSize = node.ui && node.ui.size !== undefined ? node.ui.size : 1;
    
    // Interpolate fontSize based on camera z position (zoom level)
    // z=500+ (far): smaller font, z=6- (near): larger font
    const clampedZ = Math.max(6, Math.min(500, cameraZ));
    
    // Linear interpolation similar to Mapbox
    // At z=500 (zoom 8 equivalent): fontSize = nodeSize / 4
    // At z=6 (zoom 10 equivalent): fontSize = nodeSize + 8
    const t = (clampedZ - 6) / (500 - 6); // Normalize to 0-1
    const minFontSize = nodeSize + 8; // At nearest (z=6)
    const maxFontSize = nodeSize / 2;  // At farthest (z=500)
    
    fontSize = minFontSize + t * (maxFontSize - minFontSize);
    
    // Ensure minimum readable size
    fontSize = Math.round(Math.max(8, fontSize));
  } else {
    fontSize = node.selectedLevel === 0 ? 18 : 14; // Default size for selected nodes
  }
  
  node.textUI.text = text;
  node.textUI.fontSize = fontSize;
  node.textUI.x = node.ui.position[0];
  node.textUI.y = node.ui.position[1] - node.ui.size / 2;
  return node.textUI;
}