<script setup>
import { computed, reactive, watch, onBeforeUnmount, ref, defineEmits} from 'vue';
import {getRepoInfo, getReadme, setAuthToken, getCurrentUser} from '../lib/githubClient.js';
const props = defineProps({
  name: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['listConnections']);
const repoLink = computed(() => {
  return `https://github.com/` + props.name;
});

let isAnonymous = ref(false);
getCurrentUser().then(user => {
  isAnonymous.value = !user;
});

let repoInfo = reactive({
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

const readmeInfo = reactive({
  state: 'UNAVAILABLE',
  content: '',
});

let prevFetchRepositoryInformationCall = null;
let prevFetchReadmeCall = null;

watch(() => props.name, (newValue, oldValue, cleanup) => {
  if (newValue === oldValue) return;

  prevFetchRepositoryInformationCall = fetchRepositoryInformation();
  cleanup(() => prevFetchRepositoryInformationCall?.cancel());
})

watch(() => repoInfo.name, (newValue, oldValue, cleanup) => {
  if (newValue === oldValue) return;

  prevFetchReadmeCall = fetchReadme();
  cleanup(() => prevFetchReadmeCall?.cancel());
});

function fetchReadme() {
  readmeInfo.state = 'LOADING';
  prevFetchReadmeCall?.cancel();

  let p = getReadme(props.name, repoInfo.default_branch);

  let isCancelled = false;
  p.cancel = () => {isCancelled = true;};

  p.then((data) => {
    if (isCancelled) return;
    Object.assign(readmeInfo, data);
  }).catch((err) => {
    // TODO: handle error, ask to sign in
    console.error(err);
  });
  prevFetchReadmeCall = p;
}

function fetchRepositoryInformation() {
  prevFetchRepositoryInformationCall?.cancel();

  repoInfo.state = 'LOADING';
  readmeInfo.state = 'UNAVAILABLE';

  let p = getRepoInfo(props.name);
  let isCancelled = false;
  p.cancel = () => {isCancelled = true;};

  p.then((data) => {
    if (isCancelled) return;
    Object.assign(repoInfo, data);
  }).catch((err) => {
    // TODO: handle error, ask to sign in
    repoInfo.state = 'ERROR';
    console.error(err);
    repoInfo.name = props.name; // trigger readme fetch nonetheless
  });
  prevFetchRepositoryInformationCall = p;
}

fetchRepositoryInformation();

function getOauthLink() {
  let isDev = window.location.hostname !== 'anvaka.github.io';
  const clientId = isDev ? '244bf05034e7cf9158cc' : '5f5bbe0c2623f5a7e738';
  let authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}`;
  if (isDev) {
    const redirectUri = `http://localhost:${window.location.port}/oauth.html`;
    authUrl += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }
  return authUrl;
}

function signInWithGithub(e) {
  e.preventDefault();
  const windowFeatures = 'width=800,height=600,resizable=yes,scrollbars=yes,status=yes';
  window.open(getOauthLink(), 'GitHub OAuth', windowFeatures);
}

function receiveMessage(event) {
  if (event.origin !== window.location.origin) {
    // Check if message is sent from the same domain to prevent cross-site scripting attacks
    return;
  }

  const data = event.data;
  if (data.source === 'gh_auth' && data.access_token) {
    console.log('Received data:', data);
    setAuthToken(data.access_token);
    getCurrentUser().then(user => {
      isAnonymous.value = !user;
    });
  }
}

window.addEventListener('message', receiveMessage);
onBeforeUnmount(() => {
  window.removeEventListener('message', receiveMessage);
});

function listConnections() {
  emit('listConnections');
}
</script>

<template>
  <div class="repo-viewer">
    <div>
      <h2><a :href='repoLink' target="_blank">{{name}}</a></h2>
      <div v-if="repoInfo.state === 'LOADED'">
        <div class="repo-description">
          {{repoInfo.description}}
        </div>
        <div class="byline">
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

        <div class="tags" v-if="repoInfo.topics?.length">
          <a v-for="tag in repoInfo.topics" :key="tag" class="tag" :href="'https://github.com/topics/' + tag" target="_blank">{{ tag }}</a>
        </div>
      </div>
      <div class="actions row">
        <a href="#" @click.prevent="listConnections()">List connections</a>
      </div>
      <div v-if="repoInfo.state === 'LOADING'" class="loading">
        Loading description...
      </div>
      <div v-if="repoInfo.state === 'NOT_FOUND'" class="not-found">
        Repository not found.
      </div>
      <div v-if="repoInfo.state === 'ERROR'" class="not-found">
        {{ repoInfo.error }}
      </div>
      <div v-if="isAnonymous && repoInfo.state !== 'LOADING'" class="sign-in-container">
        <a :href="getOauthLink()" @click="signInWithGithub" class="sign-in" >Sign in with Github</a> to get higher rate limits and more information about this repository.
        <span v-if="repoInfo && repoInfo.remainingRequests !== undefined">
          Remaining requests: <code>{{ repoInfo.remainingRequests }}</code>
        </span>
      </div>
      <div v-if="repoInfo.state === 'RATE_LIMIT_EXCEEDED'" class="rate-limit">
        <p>Could not fetch repository information. Rate limit exceeded.</p>
        <p>
           Please try again at {{ repoInfo.retryIn }}.
        </p>
      </div>
      <div class="readme-content" v-if="readmeInfo.state === 'LOADED'">
        <div v-html="readmeInfo.content" >
        </div>
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