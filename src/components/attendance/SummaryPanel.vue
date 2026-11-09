<script setup>
import { computed } from 'vue'
import { STATUS_LIST } from '@/stores/attendance'

const props = defineProps({
  stats: { type: Object, required: true }
})

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const ringOffset = computed(() => CIRCUMFERENCE * (1 - props.stats.rate / 100))

const legend = computed(() =>
  STATUS_LIST.map((status) => {
    const count = props.stats[status.value] || 0
    return {
      ...status,
      count,
      percent: props.stats.total ? Math.round((count / props.stats.total) * 100) : 0
    }
  })
)

const unmarkedPercent = computed(() =>
  props.stats.total ? Math.round((props.stats.unmarked / props.stats.total) * 100) : 0
)
</script>

<template>
  <section class="summary-panel">
    <header class="panel-head">
      <h3>本次考勤概览</h3>
      <el-tag size="small" round effect="light" type="info">实时统计</el-tag>
    </header>

    <div class="ring-wrap">
      <svg viewBox="0 0 128 128" class="ring">
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#409eff" />
            <stop offset="100%" stop-color="#22c55e" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" :r="RADIUS" fill="none" stroke="#eef2f7" stroke-width="11" />
        <circle
          cx="64"
          cy="64"
          :r="RADIUS"
          fill="none"
          stroke="url(#ringGradient)"
          stroke-width="11"
          stroke-linecap="round"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="ringOffset"
          transform="rotate(-90 64 64)"
          class="ring-progress"
        />
      </svg>
      <div class="ring-center">
        <strong>{{ stats.rate }}<small>%</small></strong>
        <span>出勤率</span>
      </div>
    </div>

    <ul class="legend">
      <li v-for="item in legend" :key="item.value" class="legend-item">
        <span class="dot" :style="{ background: item.color }" />
        <span class="legend-label">{{ item.label }}</span>
        <span class="legend-count">{{ item.count }}</span>
        <span class="legend-percent">{{ item.percent }}%</span>
        <span class="legend-bar">
          <i :style="{ width: `${item.percent}%`, background: item.color }" />
        </span>
      </li>
      <li v-if="stats.unmarked" class="legend-item unmarked">
        <span class="dot" :style="{ background: '#94a3b8' }" />
        <span class="legend-label">未标记</span>
        <span class="legend-count">{{ stats.unmarked }}</span>
        <span class="legend-percent">{{ unmarkedPercent }}%</span>
        <span class="legend-bar">
          <i :style="{ width: `${unmarkedPercent}%`, background: '#94a3b8' }" />
        </span>
      </li>
    </ul>

    <div class="mark-progress">
      <div class="mark-text">
        <span>点名进度</span>
        <strong>{{ stats.marked }}/{{ stats.total }}</strong>
      </div>
      <el-progress
        :percentage="stats.total ? Math.round((stats.marked / stats.total) * 100) : 0"
        :stroke-width="8"
        :show-text="false"
        :color="stats.unmarked ? '#409eff' : '#16a34a'"
      />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.summary-panel {
  background: #fff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 18px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }
}

.ring-wrap {
  position: relative;
  width: 168px;
  height: 168px;
  margin: 6px auto 10px;
}

.ring {
  width: 100%;
  height: 100%;
}

.ring-progress {
  transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;

  strong {
    font-size: 30px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
    font-variant-numeric: tabular-nums;

    small {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
    }
  }

  span {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.legend-item {
  display: grid;
  grid-template-columns: 8px 1fr auto 40px;
  grid-template-areas:
    'dot label count percent'
    'bar bar bar bar';
  align-items: center;
  gap: 2px 8px;
  font-size: 13px;

  .dot {
    grid-area: dot;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .legend-label {
    grid-area: label;
    color: var(--text-regular);
  }
  .legend-count {
    grid-area: count;
    font-weight: 600;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }
  .legend-percent {
    grid-area: percent;
    text-align: right;
    font-size: 12px;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }
  .legend-bar {
    grid-area: bar;
    height: 4px;
    margin-top: 3px;
    border-radius: 999px;
    background: #f1f5f9;
    overflow: hidden;

    i {
      display: block;
      height: 100%;
      border-radius: 999px;
      transition: width 0.45s ease;
    }
  }
}

.mark-progress {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed #e8eef6;

  .mark-text {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--text-secondary);

    strong {
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }
  }
}
</style>
