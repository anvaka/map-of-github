<script setup>
import {defineProps, watch, reactive, defineEmits, ref} from 'vue';
import {getRepoInfo} from '../lib/githubClient.js';
import LoadingIcon from './LoadingIcon.vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['show-full-preview']);

const repoInfo = reactive({
  state: 'LOADING',
  name: '',
  description: '',
  language: '',
  stars: 0,
  forks: 0,
  watchers: 0,
  branch: '',
  topics: [],
  license: '',
  updated_at: '',
  remainingRequests: 0
});

const errorInfo = ref(null);

let prevFetchRepositoryInformationCall = null;

watch(() => props.name, (newValue, oldValue, cleanup) => {
  if (newValue === oldValue) return;

  prevFetchRepositoryInformationCall = fetchRepositoryInformation();
  cleanup(() => prevFetchRepositoryInformationCall?.cancel());
})

function fetchRepositoryInformation() {
  prevFetchRepositoryInformationCall?.cancel();

  repoInfo.state = 'LOADING';

  let p = getRepoInfo(props.name);
  let isCancelled = false;
  p.cancel = () => {isCancelled = true;};

  errorInfo.value = null;
  p.then((data) => {
    if (isCancelled) return;
    if (data?.state === 'RATE_LIMIT_EXCEEDED') {
      repoInfo.state = 'ERROR';
      errorInfo.value = 'Rate limit exceeded. Please sign in to increase your rate limit.';
      return;
    } else if (data?.state === 'NOT_FOUND') {
      repoInfo.state = 'ERROR';
      errorInfo.value = 'Repository not found.';
      return;
    } else if (data?.state === 'ERROR') {
      repoInfo.state = 'ERROR';
      errorInfo.value = data.error;
      return;
    }
    Object.assign(repoInfo, data);
    p.state = 'LOADED';
  }).catch((err) => {
    if (isCancelled) return;
    console.error(err);
    p.state = 'ERROR';
    errorInfo.value = err;
  });
  prevFetchRepositoryInformationCall = p;
}

function showFullPreview() {
  emit('show-full-preview', props.name);
}

fetchRepositoryInformation();
</script>
<template>
  <a href='#' @click.prevent='showFullPreview' class='small-preview-container'>
    <div class='header'>
      <span>{{props.name}}</span>
      <loading-icon v-if="repoInfo.state === 'LOADING'"></loading-icon>
      <div class="byline" v-if="repoInfo.state === 'LOADED'">
        <span class="language">{{ repoInfo.language }}</span>
        <span class="stars">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-star" viewBox="0 0 16 16">
            <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z"/>
          </svg>
          {{ repoInfo.stars }}
        </span>
        <span class="forks">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-diagram-2" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M6 3.5A1.5 1.5 0 0 1 7.5 2h1A1.5 1.5 0 0 1 10 3.5v1A1.5 1.5 0 0 1 8.5 6v1H11a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V8h-5v.5a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 5 7h2.5V6A1.5 1.5 0 0 1 6 4.5v-1zM8.5 5a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1zM3 11.5A1.5 1.5 0 0 1 4.5 10h1A1.5 1.5 0 0 1 7 11.5v1A1.5 1.5 0 0 1 5.5 14h-1A1.5 1.5 0 0 1 3 12.5v-1zm1.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zm4.5.5a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 9 12.5v-1zm1.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1z"/>
          </svg>
          {{ repoInfo.forks }}</span>
      </div>
    </div>
    
    <div class='info' v-if="repoInfo.state === 'LOADED'">{{repoInfo.description}} </div>
    <div class='error' v-if="repoInfo.state === 'ERROR'">{{errorInfo}} </div>
  </a>
</template>

<style scoped>
.loader {
  margin: 0px;
}
.header {
  font-size: 16px;
  height: 36px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.small-preview-container {
  padding: 4px 8px;
  font-size: 12px;
  color: var(--text-color);
}
div.error {
  color: var(--critical-call-to-action)
}
.info {
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
</style>