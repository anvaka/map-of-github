<script setup>
import { defineEmits, ref } from 'vue';

const emit = defineEmits(['close']);
const geojson = window.mapOwner.getPlacesGeoJSON();
const copiedTooltipVisible = ref(false);

function onClose() {
  emit('close');
}

function copyJSON() {
  navigator.clipboard.writeText(JSON.stringify(geojson, null, 2));
  copiedTooltipVisible.value = true;
  setTimeout(() => {
    copiedTooltipVisible.value = false;
  }, 1000);
}
</script>

<template>
  <div>
    <h3>Local changes</h3>
    <!-- Icon copyright (c) 2013-2017 Cole Bemis: https://github.com/feathericons/feather/blob/master/LICENSE -->
    <a href='#' @click.prevent='onClose()' class='close-btn'>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x-circle"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
    </a>

<p>
  You have added labels for the countries, but they are not available to everyone yet. 
  Please send a pull request to make them available to everyone 🙏.
</p>
<p>
  Here is the content of the `places.geojson` with your changes.
  <a href="#" class="critical" @click.prevent="copyJSON()" 
    :class="{'copy-notification': copiedTooltipVisible}">{{ copiedTooltipVisible ? 'Copied!' : 'Copy' }}</a> them to clipboard and paste them in 
    <a href="https://github.com/anvaka/map-of-github-data/blob/main/v1/places.geojson" target="_blank" class="normal">the remote file</a>.
</p>
<pre>
{{ geojson }}
</pre>
  </div>
</template>

<style scoped>
h3 {
  margin: 0;
}
.close-btn {
  position: absolute;
  right: 8px;
  top: 8px;
}
pre {
  max-height: 200px;
  overflow: auto;
}
</style>