import { ref, nextTick } from 'vue';
import generateShortRandomId from './generateShortRandomId';
import {sendChatRequest} from './openAIClient';

export default class GroupViewModel {
  constructor() {
    this.largest = ref(null);
    this.chat = ref([])
    this.error = ref('');
    this.loading = ref(false);
    this.pendingRequest = null;
  }

  setLargest(currentLargest) {
    this.largest.value = currentLargest;
    if (this.chat.value.length ===  0) {
      this.chat.value.push({
        id: 0,
        isEdited: false,
        role: 'system',
        content: 'A user is looking at the following github repositories:' + currentLargest.slice(0, 20).map(repo => '\n- ' + repo.name).join('')
      }, 
      {
        role: 'user',
        id: 1,
        isEdited: false,
        content: '', // Please analyze these repository and detect a common theme (e.g. programming language, technology, domain). Pay attention to language too (english, chinese, korean, etc.). If there is no common theme found, please say so. Otherwise, If you can find a strong signal for a common theme please come up with a specific name for imaginary country that contains all these repositories. Give a few options. When you give an option prefer more specific over generic option (for example if repositories are about recommender systems, use that, instead of generic DeepLearning)'
      });
    }
  }

  addMessage() {
    this.chat.push({
      id: generateShortRandomId(),
      content: '',
      role: 'user',
      isEdited: true
    });
  }

  submit(model) {
    this.error = '';
    this.pendingRequest?.cancel();
    let request = {
      model,
      messages: this.chat.map(message => {
        return {
          content: message.content,
          role: message.role
        }
      }),
    }
    this.chat.forEach(message => {
      message.isEdited = false;
    });
    let isCancelled = false;
    this.loading = true;
    let p = sendChatRequest(request).then(responseMessage => {
      if (isCancelled) return;
      this.loading = false;
      let newMessageId = generateShortRandomId();
      responseMessage.id = newMessageId;
      this.chat.push(responseMessage);
      nextTick(() => {
        let newMessageEl = document.querySelector(`.add-message-link`);
        if (newMessageEl) newMessageEl.scrollIntoView();
      });
    }).catch(err => {
      console.error(err);
      this.error = 'Something went wrong. Open dev console for more details';
    }).finally(() => {
      this.loading = false;
    });
    p.cancel = () => { isCancelled = true; }
    this.pendingRequest = p;
  }

  deleteMessage(id) {
    this.chat = this.chat.filter(message => message.id !== id);
  }

  cancelQuery() {
    this.loading = false;
    this.pendingRequest?.cancel();
  }
}