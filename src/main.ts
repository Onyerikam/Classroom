import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

import 'element-plus/theme-chalk/src/index.scss';
import './styles/index.scss';

const app = createApp(App);

app.use(createPinia());
app.mount('#app');
