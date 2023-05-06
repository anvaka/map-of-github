<script setup>
import {defineProps, defineEmits, computed} from 'vue';
import ChatContainer from './ChatContainer.vue';
const props = defineProps({
  repos: {
    type: Array,
    required: true
  }
});
const emit = defineEmits(['selected', 'close']);

function showDetails(repo) {
  emit("selected", {
    text: repo.name,
    lon: repo.lngLat[1],
    lat: repo.lngLat[0],
  });
}
function closePanel() {
  emit("close");
}

function getLink(repo) {
  return 'https://github.com/' + repo.name;
}

const promptMessage = computed(() => {
  return [{
    role: 'system',
    content: 'A user is looking at the following github repositories:' + props.repos.slice(0, 20).map(repo => '\n- ' + repo.name).join('')
  }, {
    role: 'user',
    content: ''
  }];
});
</script>
<template>
  <div>
    <div class="names-container">
      <h2><a class='search-submit' href='#' @click.prevent='closePanel()'>
  <!-- Icon copyright (c) 2013-2017 Cole Bemis: https://github.com/feathericons/feather/blob/master/LICENSE -->
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x-circle">
    <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  </a>In this country</h2>
      <ul v-if="props.repos.length">
        <li v-for="repo in props.repos" :key="repo.name">
          <a :href="getLink(repo)" @click.prevent="showDetails(repo)" target="_blank">{{repo.name}}</a>
        </li>
      </ul>
      <div v-else>
        <p>No repositories found. Try zooming in?</p>
      </div>
    </div>
    <chat-container description="Wanna learn more about these projects?" :messages="promptMessage" class="chat-container"/>
  </div>
</template>
<style scoped>
.names-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
h2 {
  margin-bottom: 4px
}

ul {
  list-style: none;
  padding: 0;
  overflow-y: auto;
}
.chat-container {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--color-border)
}

</style>