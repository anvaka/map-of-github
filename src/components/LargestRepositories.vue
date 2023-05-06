<script setup>
import {defineProps, defineEmits} from 'vue';
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

</script>
<template>
  <div>
    <h2>
      
    <a class='search-submit' href='#' @click.prevent='closePanel()'>
<!-- Icon copyright (c) 2013-2017 Cole Bemis: https://github.com/feathericons/feather/blob/master/LICENSE -->
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x-circle">
  <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
</a>
      In this country:</h2>
    <ul>
      <li v-for="repo in props.repos" :key="repo.name">
        <a :href="getLink(repo)" @click.prevent="showDetails(repo)" target="_blank">{{repo.name}}</a>
      </li>
    </ul>
  </div>
</template>
<style scoped>
ul {
  list-style: none;
  padding: 0;
  max-height: 40%;
  overflow-y: auto;
}
</style>