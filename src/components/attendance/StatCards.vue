<script setup>
import { computed } from 'vue'
import { CircleCheck, Clock, User, UserFilled } from '@element-plus/icons-vue'

const props = defineProps({
  stats: { type: Object, required: true }
})

const cards = computed(() => [
  {
    key: 'total',
    label: '应到人数',
    value: props.stats.total,
    unit: '人',
    hint: '当前名单总人数',
    icon: User,
    color: '#409eff',
    bg: '#ecf5ff'
  },
  {
    key: 'arrived',
    label: '实到人数',
    value: props.stats.arrived,
    unit: '人',
    hint: `出勤 ${props.stats.present} · 迟到 ${props.stats.late}`,
    icon: CircleCheck,
    color: '#16a34a',
    bg: '#e9f9ef'
  },
  {
    key: 'leave',
    label: '请假人数',
    value: props.stats.leave,
    unit: '人',
    hint: '已提交请假申请',
    icon: Clock,
    color: '#2563eb',
    bg: '#eaf1ff'
  },
  {
    key: 'absent',
    label: '缺勤人数',
    value: props.stats.absent,
    unit: '人',
    hint: props.stats.unmarked ? `另有 ${props.stats.unmarked} 人未标记` : '已全部完成标记',
    icon: UserFilled,
    color: '#dc2626',
    bg: '#fdecec'
  }
])
</script>

<template>
  <div class="stat-cards">
    <div v-for="card in cards" :key="card.key" class="stat-card">
      <span class="stat-icon" :style="{ color: card.color, background: card.bg }">
        <el-icon :size="18"><component :is="card.icon" /></el-icon>
      </span>
      <div class="stat-body">
        <span class="stat-label">{{ card.label }}</span>
        <div class="stat-value">
          {{ card.value }}<small>{{ card.unit }}</small>
        </div>
        <span class="stat-hint">{{ card.hint }}</span>
      </div>
      <span class="stat-glow" :style="{ background: card.color }" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.stat-card {
  position: relative;
  overflow: hidden;
  display: flex;
  gap: 12px;
  padding: 16px 16px 14px;
  background: #fff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-base);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
}

.stat-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.15;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;

  small {
    margin-left: 3px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
  }
}

.stat-hint {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-glow {
  position: absolute;
  right: -18px;
  bottom: -22px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  opacity: 0.07;
}

@media (max-width: 720px) {
  .stat-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
