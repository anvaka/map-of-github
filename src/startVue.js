import { createApp } from 'vue'
import App from './App.vue'


export default function startApp() {
  const app = createApp(App);
  app.directive('focus', {
    mounted(el) {
      el.focus()
    }
  });

  app.mount('#app')
}