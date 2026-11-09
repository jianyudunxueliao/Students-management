<script setup>
import { useRoute } from 'vue-router'
import { Calendar, Lock, Select } from '@element-plus/icons-vue'

const route = useRoute()
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <router-link to="/assignment4" class="brand">
        <span class="brand-mark">
          <el-icon :size="18"><Select /></el-icon>
        </span>
        <span class="brand-text">
          <strong>课堂考勤</strong>
          <small>Classroom Attendance</small>
        </span>
      </router-link>

      <nav class="nav">
        <router-link
          to="/assignment4"
          class="nav-item"
          :class="{ active: route.path === '/assignment4' }"
        >
          考勤台
        </router-link>
      </nav>

      <div class="header-right">
        <span class="term">
          <el-icon><Calendar /></el-icon>
          2026 秋季学期
        </span>
        <el-tooltip content="名单与考勤记录保存在浏览器本地，刷新不会丢失" placement="bottom">
          <span class="local-tip">
            <el-icon><Lock /></el-icon>
            本地存储
          </span>
        </el-tooltip>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid rgba(17, 34, 68, 0.06);
}

.header-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 32px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  color: inherit;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #409eff, #6366f1);
  box-shadow: 0 4px 10px rgba(64, 158, 255, 0.35);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;

  strong {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.3px;
    color: var(--text-primary);
  }
  small {
    font-size: 11px;
    color: var(--text-secondary);
    letter-spacing: 0.4px;
  }
}

.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.nav-item {
  position: relative;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-regular);
  transition: var(--transition-base);

  &:hover {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &.active {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    font-weight: 600;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.term,
.local-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.local-tip {
  padding: 4px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  cursor: default;
}

@media (max-width: 768px) {
  .header-inner {
    padding: 0 16px;
    gap: 12px;
  }
  .term {
    display: none;
  }
  .brand-text small {
    display: none;
  }
}
</style>
