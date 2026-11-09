import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'
import { copyFileSync, existsSync } from 'node:fs'

// GitHub Pages 项目站点需要通过仓库名作为 base 路径。
// 本地开发默认 '/'；部署时由工作流注入 VITE_BASE_REPO=仓库名。
const repoName = process.env.VITE_BASE_REPO

// 单页应用部署到 GitHub Pages 时，直接访问子路由会 404，
// 复制一份 index.html 作为 404.html 让路由接管。
function spaFallback() {
  let outDir = ''
  return {
    name: 'spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const index = fileURLToPath(new URL(`./${outDir}/index.html`, import.meta.url))
      const fallback = fileURLToPath(new URL(`./${outDir}/404.html`, import.meta.url))
      if (existsSync(index)) copyFileSync(index, fallback)
    }
  }
}

export default defineConfig({
  base: repoName ? `/${repoName}/` : '/',
  plugins: [
    vue(),
    // Element Plus 按需引入 - 自动导入 API
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: false
    }),
    // Element Plus 按需引入 - 自动注册组件
    Components({
      resolvers: [ElementPlusResolver()],
      dts: false
    }),
    spaFallback()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false
  }
})
