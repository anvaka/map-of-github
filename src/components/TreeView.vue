<script setup>
import { defineProps, defineEmits, ref } from 'vue';

defineProps({
  tree: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['nodeSelected']);
// Create a unique key for each node based on its ID and parent path
function getNodeKey(nodeId, parentPath = '') {
  return `${parentPath}_${nodeId}`;
}

const expandedNodes = ref(new Set());

function selectNode(node, event) {
  emit('nodeSelected', node, event);
}

function toggleExpand(nodeId, parentPath = '') {
  const nodeKey = getNodeKey(nodeId, parentPath);
  if (expandedNodes.value.has(nodeKey)) {
    expandedNodes.value.delete(nodeKey);
  } else {
    expandedNodes.value.add(nodeKey);
  }
}

function isExpanded(nodeId, parentPath = '') {
  const nodeKey = getNodeKey(nodeId, parentPath);
  return expandedNodes.value.has(nodeKey);
}
</script>

<template>
  <div class="tree-view">
    <ul>
      <!-- Root node only shown if it has no children or as a special case -->
      <li v-if="!tree.children || tree.children.length === 0">
        <div class="node-item">
          <a href="#" @click.prevent="selectNode(tree.node, $event)">{{ tree.node.name }}</a>
          <span v-if="tree.node.isExternal" title="External country">E</span>
        </div>
      </li>
      
      <!-- Otherwise, only show the children with toggle controls -->
      <template v-else>
        <li v-for="child in tree.children" :key="child.node.id">
          <div class="node-item">
            <span 
              v-if="child.children && child.children.length" 
              class="toggle" 
              @click="toggleExpand(child.node.id, tree.node.id)"
            >
              {{ isExpanded(child.node.id, tree.node.id) ? '▼' : '▶' }}
            </span>
            <span v-else class="toggle-placeholder"></span>
            <a href="#" @click.prevent="selectNode(child.node, $event)">{{ child.node.name }}</a>
            <span v-if="child.node.isExternal" title="External country">E</span>
          </div>
          <ul v-if="isExpanded(child.node.id, tree.node.id) && child.children && child.children.length > 0">
            <li v-for="grandChild in child.children" :key="grandChild.node.id">
              <div class="node-item">
                <span class="toggle-placeholder"></span>
                <a href="#" @click.prevent="selectNode(grandChild.node, $event)">{{ grandChild.node.name }}</a>
                <span v-if="grandChild.node.isExternal" title="External country">E</span>
              </div>
            </li>
          </ul>
        </li>
      </template>
    </ul>
  </div>
</template>

<style scoped>
.tree-view {
  margin-top: 8px;
}

.tree-view ul {
  list-style: none;
  padding: 0;
}

.tree-view ul ul {
  padding-left: 20px;
}

.node-item {
  padding: 4px 0;
}

.node-item a {
  text-decoration: none;
  color: inherit;
}

.node-item a:hover {
  text-decoration: underline;
}

.toggle {
  display: inline-block;
  width: 16px;
  cursor: pointer;
  user-select: none;
  font-size: 0.8em;
}

.toggle-placeholder {
  display: inline-block;
  width: 16px;
}
</style>