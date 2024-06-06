<script setup>
import { computed, defineEmits} from 'vue';
const props = defineProps({
  name: {
    type: String,
    required: true
  },
  id: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['listConnections']);
const repoLink = computed(() => {
  return `https://boardgamegeek.com/boardgame/` + props.id;
});

function listConnections() {
  emit('listConnections');
}
</script>

<template>
  <div class="repo-viewer">
    <div>
      <h2><a :href='repoLink' target="_blank">{{name}}</a></h2>
      <div class="actions row">
        <a href="#" @click.prevent="listConnections()">List connections</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
h2 {
  font-size: 24px;
  max-width: 100%;
  text-overflow: ellipsis;
  overflow: hidden;;
}

.repo-viewer {
  padding-top: 70px;
  padding-left: 8px;
  padding-right: 8px;
}

h2 a {
  color: var(--color-link-hover);
}
.repo-description {
  line-height: 1.2em;
  max-width: 100%;
  text-overflow: ellipsis;
  overflow: hidden;;
}
.byline {
  margin: 8px 0;
  font-size: 12px;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
}

.byline span {
  margin-right: 8px;
  display: inline-block;
}
.tags {
  overflow-y: hidden;
  overflow-x: auto;
  white-space: nowrap;
}
.tags a {
  margin-right: 8px;
  display: inline-block;
  background-color: var(--color-tag-bg);
  color: var(--color-tag-text);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 16px;
}

.tags a:hover {
  color: var(--color-link-hover);
}
.sign-in-container {
  margin-top: 16px;
  font-size: 12px;
}
.sign-in-container a {
  color: var(--critical-call-to-action);
}

.actions {
  border-top: 1px solid var(--color-border);
  margin-top: 8px;
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  height: 32px;
  align-items: stretch;
}
.actions a {
  align-items: center;
  display: flex;
  background: var(--color-background-mute);
  padding: 0 8px;
  flex: 1;
  justify-content: center;
}
.not-found {
  margin-top: 16px;
  border-top: 1px solid var(--color-border);
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>


<style>

.readme-content {
  border-top: 1px solid var(--color-border);
  padding-top: 8px;
  overflow-x: hidden;
}
.readme-content a {
  color: var(--color-link-hover);
}
.readme-content p {
  margin-bottom: 16px;
  margin-top: 0;
}
.readme-content h1 {
  border-bottom: 1px solid var(--color-border);
}
.readme-content pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  border-radius: 6px;
}
.readme-content img {
  max-width: 100%;
}
</style>