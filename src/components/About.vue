<script setup>
import { defineEmits, onMounted, onBeforeUnmount, ref } from 'vue';
import { getCachedCurrentUser, signOut } from '../lib/githubClient.js';
import bus from '../lib/bus.js';

const currentUser = ref(getCachedCurrentUser());
const emit = defineEmits(['close']);

function close() {
  emit('close');
}

function updateCurrentUser() {
  currentUser.value = getCachedCurrentUser();
}

onMounted(() => {
  bus.on('auth-changed', updateCurrentUser);
});

onBeforeUnmount(() => {
  bus.off('auth-changed', updateCurrentUser);
});


</script>
<template>
  <div>
    <div class='row'>
      <h2>Map of GitHub</h2>
      <!-- Icon copyright (c) 2013-2017 Cole Bemis: https://github.com/feathericons/feather/blob/master/LICENSE -->
        <a href='#' @click.prevent='close' class='close-btn'>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x-circle"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        </a>
    </div>
    <div class="container">
      <p>
        <img src="../../public/apple-touch-icon.png" alt="GitHub Map" class="map-image">
        Each dot is a GitHub project. Two dots within the same cluster are 
        usually close to each other if multiple users frequently gave stars to
        both projects. The size of the dot indicates the number of stars the
        project has received.
      </p>
      <p>
        The map has more than <b>400,000</b> projects, clustered into <b>1,100</b> countries.
        I'm looking for help from the community to improve the map. If you have
        good names for countries, right click on a map and give them name, send a pull request to me.
      </p>
      <h2>Credits</h2>
      <p>
        The cute logo of the project was created by my 9-years-old daughter <b>Louise Kashcha</b>,
        who is an amazing artist and the biggest fan of cats I ever known. Thank you so much, Louise ❤️!
      </p>
      <h2>Support</h2>
      <p>
        If you love this project, please consider supporting it on <a href="https://github.com/sponsors/anvaka" class='normal'>GitHub</a>.
        Follow me on <a href="https://twitter.com/anvaka" class='normal'>Twitter</a> for updates. The source code is <a href="https://github.com/anvaka/map-of-github" class='normal'>here</a>.
      </p>
      <p>
        Gratefully yours, <br>
        <b>anvaka</b>
      </p>
    </div>

    <div v-if="currentUser" class="user-info">
      You are logged in as <b>{{currentUser.login}}</b> (<a href='#' @click.prevent="signOut" class="normal">log out</a>)
    </div>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.row h2 {
  margin: 8px 8px 0 8px;
  flex: 1;
}
.map-image {
  width: 64px;
  float: left;
}

.close-btn {
  align-self: stretch;
  align-items: center;
  display: flex;
  padding: 0 8px;
}

.container {
  padding: 8px;
  flex: 1;
  overflow-y: auto;
}
h4 {
  margin: 0;
  font-weight: normal;
  text-align: right;
}
.byline {
  margin: 0 8px 8px;
  font-size: 12px;
}

.user-info {
  margin: 8px;
}
p {
  margin: 0 0 8px 0;
  line-height: 1.5em;
}
b {
  font-weight: bold;
}
</style>