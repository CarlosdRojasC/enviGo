import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css';

createApp(App)
  .use(router)
  .use(pinia)
    .use(Toast, {
    transition: "Vue-Toastification__bounce",
  maxToasts: 5,
  newestOnTop: true
})
  .mount('#app')
