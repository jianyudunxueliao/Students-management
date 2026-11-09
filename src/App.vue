<script setup>
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div class="app-wrapper">
    <AppHeader />
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.app-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
}

.app-main {
  flex: 1;
  padding-top: 64px;
}
</style>
