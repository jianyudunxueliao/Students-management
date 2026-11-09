<script setup>
import { useRouter } from 'vue-router'
import { Back } from '@element-plus/icons-vue'

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <div class="code">404</div>
    <h1>页面走丢了</h1>
    <p>你访问的页面不存在，返回考勤台继续点名吧。</p>
    <el-button type="primary" size="large" @click="router.push('/assignment4')">
      <el-icon><Back /></el-icon>
      返回考勤台
    </el-button>
  </div>
</template>

<style lang="scss" scoped>
.not-found {
  min-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;

  .code {
    font-size: 88px;
    font-weight: 800;
    line-height: 1;
    background: linear-gradient(135deg, #409eff, #6366f1);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  h1 {
    margin: 16px 0 8px;
    font-size: 22px;
    color: var(--text-primary);
  }

  p {
    margin: 0 0 24px;
    font-size: 14px;
    color: var(--text-secondary);
  }
}
</style>
