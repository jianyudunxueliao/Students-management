import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Element Plus 基础样式（按需引入组件时仍需引入）
import 'element-plus/dist/index.css'
// 全局样式与设计令牌
import '@/assets/styles/global.scss'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
