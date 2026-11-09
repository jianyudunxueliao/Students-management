import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/assignment4'
  },
  {
    path: '/assignment4',
    name: 'Assignment4',
    component: () => import('@/views/Assignment4.vue'),
    meta: { title: '课堂考勤' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '页面不存在' }
  }
]

// BASE_URL 由 Vite 注入：本地为 '/'，GitHub Pages 为 '/仓库名/'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = `${to.meta.title} · 签到台`
  }
})

export default router
