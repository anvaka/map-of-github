<script setup>
import { defineProps, ref, nextTick, watch} from 'vue';
import generateShortRandomId from '../lib/generateShortRandomId.js';
import { chat } from '../lib/openAIClient';

const props = defineProps({
  messages: {
    type: Array,
    required: false
  },
  models: {
    type: Array,
    required: true
  }
});

const selectedModel = ref(props.models[0].id);
const error = ref('');
let loading = ref(false);
let pendingRequest;

let computedMessages = ref(props.messages?.map((message, idx) => {
    return {
      id: idx,
      content: message.content,
      role: message.role,
      isEdited: false
    }
  }) || []);

watch(() => props.messages, (newValue, oldValue) => {
  if (newValue === oldValue) return;
  computedMessages.value = newValue.map((message, idx) => {
    return {
      id: idx,
      content: message.content,
      role: message.role,
      isEdited: false
    }
  });
});


function addMessage() {
  computedMessages.value.push({
    id: generateShortRandomId(),
    content: '',
    role: 'user',
    isEdited: true
  });
}

function submit() {
  error.value = '';
  pendingRequest?.cancel();
  let request = {
    model: selectedModel.value,
    messages: computedMessages.value.map(message => {
      return {
        content: message.content,
        role: message.role
      }
    }),
  }
  computedMessages.value.forEach(message => {
    message.isEdited = false;
  });
  let isCancelled = false;
  loading.value = true;
  let p = chat(request).then(responseMessage => {
    if (isCancelled) return;
    loading.value = false;
    let newMessageId = generateShortRandomId();
    responseMessage.id = newMessageId;
    computedMessages.value.push(responseMessage);
    nextTick(() => {
      let newMessageEl = document.querySelector(`.add-message-link`);
      if (newMessageEl) newMessageEl.scrollIntoView();
    });
  }).catch(err => {
    console.error(err);
    error.value = 'Something went wrong. Open dev console for more details';
  }).finally(() => {
    loading.value = false;
  });
  p.cancel = () => { isCancelled = true; }
  pendingRequest = p;
}

function deleteMessage(id) {
  computedMessages.value = computedMessages.value.filter(message => message.id !== id);
}

function getDisplayContent(message) {
  if (message.content.length > 0) {
    return message.content;
  }
  return `Enter message here`;
}

function submitOnCmdEnter(event) {
  if (event.key === 'Enter' && event.metaKey) {
    event.target.blur();
    submit();
    event.preventDefault();
  } else if (event.key === 'Escape') {
    event.target.blur();
    event.preventDefault();
  }
}

function cancelQuery() {
  loading.value = false;
  pendingRequest?.cancel();
}

const vTextareaFitContentSize = {
  beforeMount(el) {
    function resize() {
      el.style.height = 'auto';
      el.style.height = Math.max(48, el.scrollHeight) + 'px';
    }
    el.addEventListener('input', resize);
    el.addEventListener('focus', resize);
    resize();
    el._cleanup = () => {
      el.removeEventListener('input', resize);
      el.removeEventListener('focus', resize);
    }
  },
  unmounted(el) {
    el._cleanup();
  }
}

</script>
<template>
<div class="select-and-chat">
  <select v-model="selectedModel">
    <option v-for="model in models" :key="model.id" :value="model.id">{{ model.id }}</option>
  </select>
  <div class="container">
    <ul class="message-list">
      <li v-for="message in computedMessages" :key="message.id" class="message"
          :class="{
            'user-role': message.role === 'user',
            [message.id]: true
          }">
        <b class="user-role-name">{{ message.role }}</b>
        <a v-if="!message.isEdited" 
          href="#" @click.prevent="message.isEdited = !message.isEdited" 
          class="content" 
          :class="{'system-role': message.role === 'system'}">{{ getDisplayContent(message) }}</a>
        <textarea v-model="message.content"
          v-textarea-fit-content-size
          v-if="message.isEdited" 
          @blur="message.isEdited = !message.isEdited" 
          @keydown="submitOnCmdEnter($event)"
          v-focus 
          placeholder="Enter message here">
        </textarea>
        <a href="#" @click.prevent="deleteMessage(message.id)" class="delete" v-if="message.role !== 'system'">x</a>
      </li>
      <li>
        <a href="#" @click.prevent="addMessage()" class="normal add-message-link" v-if="!loading">Add message</a>
      </li>
    </ul>
    <div class='actions' v-if="!loading">
      <div class="error" v-if="error">{{ error }}</div>
      <a href="#" @click.prevent="submit()" class="normal">Submit</a>
    </div>
    <div class="actions" v-if="loading">
      <div class="loader-container">
        <div class="loader"></div>
        <a href="#" @click.prevent="cancelQuery()" class="critical label">Cancel</a>
      </div>
    </div>
  </div>
</div>
</template>

<style scoped>
.loader {
  border: 2px solid var(--color-border);
  border-top: 2px solid var(--color-link-hover);
  border-radius: 50%;
  width: 10px;
  height: 10px;
  animation: spin 1s linear infinite;
  margin: auto;
  display: inline-block;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loader-container .label {
  display: inline-block;
  margin-left: 8px;
}
.select-and-chat {
  overflow: hidden;
  grid-template-rows: auto 1fr;
  display: grid;
  height: 100%;
}
.container {
  display: grid;
  grid-template-rows: 1fr 42px;
  overflow: hidden;
  height: 100%;
}
.actions {
  display: flex;
  justify-content: flex-end;
  padding: 8px;
}

.message-list {
  flex: 1;
  overflow-y: scroll;
  list-style: none;
  padding: 0;
  margin: 0;
  height: 100%;
}

.message {
  display: grid;
  grid-template-columns: 64px 1fr 24px;
  min-height: 48px;
}
.message a.content {
  padding: 0 8px;
  white-space: pre-wrap;
}
.message a.system-role {
  max-height: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.message.user-role {
  background-color: var(--color-background-soft);
}
.message a.delete {
  text-align: center;
}
textarea {
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  color: var(--color-heading);
  font-size: 14px;
  line-height: 1.6;
  padding: 2px 8px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
    Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
}

textarea:focus {
  outline: none;
}
</style>