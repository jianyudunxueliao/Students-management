<script setup>
import { Delete, Download, Timer, View } from '@element-plus/icons-vue'

defineProps({
  sessions: { type: Array, default: () => [] }
})

const emit = defineEmits(['view', 'remove', 'export'])

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function weekday(date) {
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? '' : WEEKDAYS[parsed.getDay()]
}

function monthDay(date) {
  return date ? date.slice(5).replace('-', '/') : '--/--'
}
</script>

<template>
  <section class="history-panel">
    <header class="panel-head">
      <div class="head-title">
        <h3>考勤历史</h3>
        <span v-if="sessions.length" class="count">{{ sessions.length }} 节</span>
      </div>
      <el-tooltip content="每次保存的考勤记录都会保留在这里" placement="top">
        <el-icon class="hint-icon"><Timer /></el-icon>
      </el-tooltip>
    </header>

    <ul v-if="sessions.length" class="history-list">
      <li v-for="session in sessions" :key="session.id" class="history-item" @click="emit('view', session)">
        <div class="date-block">
          <strong>{{ monthDay(session.date) }}</strong>
          <span>{{ weekday(session.date) }}</span>
        </div>
        <div class="session-info">
          <div class="session-title">
            <span class="course">{{ session.course }}</span>
            <span class="rate" :class="{ low: session.stats.rate < 80 }">{{ session.stats.rate }}%</span>
          </div>
          <div class="session-meta">
            {{ session.stats.total }} 人 · 出勤 {{ session.stats.arrived }} · 缺勤 {{ session.stats.absent }}
          </div>
          <div class="mini-bar">
            <i
              class="present"
              :style="{ width: `${session.stats.total ? (session.stats.present / session.stats.total) * 100 : 0}%` }"
            />
            <i
              class="late"
              :style="{ width: `${session.stats.total ? (session.stats.late / session.stats.total) * 100 : 0}%` }"
            />
            <i
              class="leave"
              :style="{ width: `${session.stats.total ? (session.stats.leave / session.stats.total) * 100 : 0}%` }"
            />
            <i
              class="absent"
              :style="{ width: `${session.stats.total ? (session.stats.absent / session.stats.total) * 100 : 0}%` }"
            />
          </div>
        </div>
        <div class="session-actions" @click.stop>
          <el-tooltip content="查看明细" placement="top">
            <el-button text size="small" @click="emit('view', session)">
              <el-icon><View /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="导出 CSV" placement="top">
            <el-button text size="small" @click="emit('export', session)">
              <el-icon><Download /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="删除记录" placement="top">
            <el-button text size="small" class="danger" @click="emit('remove', session)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </li>
    </ul>

    <el-empty
      v-else
      :image-size="64"
      description="还没有历史记录，保存本次考勤后会显示在这里"
      class="history-empty"
    />
  </section>
</template>

<style lang="scss" scoped>
.history-panel {
  background: #fff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 18px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.head-title {
  display: flex;
  align-items: baseline;
  gap: 8px;

  h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .count {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.hint-icon {
  color: var(--text-placeholder);
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 380px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: var(--transition-base);

  &:hover {
    background: #f7f9fd;

    .session-actions {
      opacity: 1;
    }
  }
}

.date-block {
  width: 48px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 0;
  border-radius: 9px;
  background: #f1f6ff;

  strong {
    font-size: 14px;
    font-weight: 700;
    color: var(--el-color-primary);
    font-variant-numeric: tabular-nums;
  }
  span {
    font-size: 11px;
    color: var(--text-secondary);
  }
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-title {
  display: flex;
  align-items: center;
  gap: 8px;

  .course {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rate {
    font-size: 12px;
    font-weight: 600;
    color: var(--c-present);

    &.low {
      color: var(--c-absent);
    }
  }
}

.session-meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-bar {
  display: flex;
  height: 4px;
  margin-top: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: #f1f5f9;

  i {
    display: block;
    height: 100%;
  }
  .present {
    background: var(--c-present);
  }
  .late {
    background: var(--c-late);
  }
  .leave {
    background: var(--c-leave);
  }
  .absent {
    background: var(--c-absent);
  }
}

.session-actions {
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s;

  .danger {
    color: var(--c-absent);
  }
}

.history-empty {
  padding: 10px 0;
}
</style>
