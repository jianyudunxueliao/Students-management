<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import {
  CircleCheck,
  Delete,
  Download,
  MoreFilled,
  Plus,
  RefreshLeft,
  Search,
  Upload
} from '@element-plus/icons-vue'
import {
  COURSE_OPTIONS,
  STATUS_LIST,
  STATUS_MAP,
  UNMARKED,
  useAttendanceStore
} from '@/stores/attendance'
import StatCards from '@/components/attendance/StatCards.vue'
import SummaryPanel from '@/components/attendance/SummaryPanel.vue'
import HistoryPanel from '@/components/attendance/HistoryPanel.vue'
import ImportStudentsDialog from '@/components/attendance/ImportStudentsDialog.vue'

const store = useAttendanceStore()

const importVisible = ref(false)
const keyword = ref('')
const classFilter = ref('')
const statusFilter = ref('all')
const tableRef = ref(null)
const selectedIds = ref([])
const workspaceRef = ref(null)

const detailVisible = ref(false)
const activeSession = ref(null)

const filteredStudents = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return store.students.filter((student) => {
    if (kw && !`${student.name}${student.studentNo}`.toLowerCase().includes(kw)) return false
    if (classFilter.value && student.className !== classFilter.value) return false
    if (statusFilter.value !== 'all' && store.statusOf(student.id) !== statusFilter.value) {
      return false
    }
    return true
  })
})

const filterChips = computed(() => [
  { value: 'all', label: '全部', count: store.stats.total, color: '#409eff' },
  ...STATUS_LIST.map((status) => ({
    value: status.value,
    label: status.label,
    count: store.stats[status.value],
    color: status.color
  })),
  { value: 'unmarked', label: '未标记', count: store.stats.unmarked, color: UNMARKED.color }
])

const hasFilter = computed(
  () => Boolean(keyword.value.trim()) || Boolean(classFilter.value) || statusFilter.value !== 'all'
)

const quickScope = computed(() =>
  hasFilter.value ? `当前筛选结果 ${filteredStudents.value.length} 人` : `全部 ${store.students.length} 人`
)

function onSelectionChange(rows) {
  selectedIds.value = rows.map((row) => row.id)
}

function clearSelection() {
  tableRef.value?.clearSelection()
  selectedIds.value = []
}

function clearFilters() {
  keyword.value = ''
  classFilter.value = ''
  statusFilter.value = 'all'
}

watch([keyword, classFilter, statusFilter], clearSelection)

function markFiltered(status) {
  const ids = filteredStudents.value.map((student) => student.id)
  if (!ids.length) {
    ElMessage.info('当前没有可标记的学生')
    return
  }
  store.markMany(ids, status, `批量标记${STATUS_MAP[status].label}`)
  ElMessage.success(`已将 ${ids.length} 名学生标记为${STATUS_MAP[status].label}`)
}

function markSelected(status) {
  if (!selectedIds.value.length) return
  store.markMany(selectedIds.value, status, `批量标记${STATUS_MAP[status].label}`)
  ElMessage.success(`已将 ${selectedIds.value.length} 名学生标记为${STATUS_MAP[status].label}`)
}

function markUnmarkedAbsent() {
  const ids = store.students
    .filter((student) => store.statusOf(student.id) === 'unmarked')
    .map((student) => student.id)
  if (!ids.length) return
  store.markMany(ids, 'absent', '未标记学生记为缺勤')
  ElMessage.success(`已将 ${ids.length} 名未标记学生记为缺勤`)
}

async function resetAll() {
  if (!Object.keys(store.draft.records).length) {
    ElMessage.info('本次还没有任何标记')
    return
  }
  try {
    await ElMessageBox.confirm('确定清空本次全部标记吗？该操作可以撤销。', '重置标记', {
      type: 'warning',
      confirmButtonText: '重置',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  store.resetRecords()
  clearSelection()
  ElMessage.success('已重置本次标记')
}

function handleUndo() {
  const label = store.undo()
  if (label) ElMessage.success(`已撤销：${label}`)
}

async function removeStudent(student) {
  try {
    await ElMessageBox.confirm(
      `确认将 ${student.name}（${student.studentNo}）从名单中移除吗？`,
      '移除学生',
      {
        type: 'warning',
        confirmButtonText: '移除',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }
  store.removeStudents([student.id])
  clearSelection()
  ElMessage.success(`已移除 ${student.name}`)
}

async function handleMore(command) {
  if (command === 'sample') {
    if (store.students.length) {
      try {
        await ElMessageBox.confirm('载入示例数据会替换当前名单，是否继续？', '载入示例', {
          type: 'warning',
          confirmButtonText: '继续',
          cancelButtonText: '取消'
        })
      } catch {
        return
      }
    }
    store.loadSample()
    clearSelection()
    ElMessage.success('已载入 18 名示例学生与两节历史考勤')
  }

  if (command === 'clear') {
    if (!store.students.length) {
      ElMessage.info('当前名单已经是空的')
      return
    }
    try {
      await ElMessageBox.confirm(
        '清空名单不会删除已保存的历史考勤记录，是否继续？',
        '清空名单',
        { type: 'warning', confirmButtonText: '清空', cancelButtonText: '取消' }
      )
    } catch {
      return
    }
    store.clearRoster()
    clearSelection()
    ElMessage.success('已清空学生名单')
  }
}

async function handleSave() {
  if (!store.students.length) {
    ElMessage.warning('请先导入学生名单')
    return
  }

  if (store.stats.unmarked) {
    try {
      await ElMessageBox.confirm(
        `还有 ${store.stats.unmarked} 名学生未标记，未标记将按“缺勤”计入本次考勤。是否继续保存？`,
        '保存考勤',
        { type: 'warning', confirmButtonText: '继续保存', cancelButtonText: '回去标记' }
      )
    } catch {
      return
    }
  }

  const result = store.saveSession()
  if (!result.ok) {
    ElMessage.warning(result.message)
    return
  }
  ElMessage.success(
    result.updated
      ? `已更新「${store.draft.course} · ${store.draft.date}」的考勤记录`
      : '考勤记录已保存，可在右侧历史中查看'
  )
}

function exportCurrent() {
  if (!store.students.length) {
    ElMessage.warning('请先导入学生名单')
    return
  }
  store.exportCsv()
  ElMessage.success('考勤表已导出为 CSV')
}

function viewSession(session) {
  activeSession.value = session
  detailVisible.value = true
}

async function removeSession(session) {
  try {
    await ElMessageBox.confirm(
      `确认删除「${session.course} · ${session.date}」的考勤记录吗？`,
      '删除记录',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  store.deleteSession(session.id)
  if (activeSession.value?.id === session.id) detailVisible.value = false
  ElMessage.success('已删除该条考勤记录')
}

function exportSession(session) {
  store.exportCsv(session)
  ElMessage.success('考勤明细已导出')
}

async function loadActiveSession() {
  if (!activeSession.value) return
  store.loadSession(activeSession.value)
  detailVisible.value = false
  ElMessage.success('已载入该节课的记录，可继续修改后保存')
  await nextTick()
  workspaceRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function handleViewFromHistory(session) {
  viewSession(session)
}
</script>

<template>
  <div class="attendance-page">
    <div class="container">
      <!-- 顶部介绍 -->
      <section class="page-hero">
        <div class="hero-content">
          <span class="hero-eyebrow"><i /> Assignment 4 · 课堂考勤模块</span>
          <h1>三秒点名，出勤数据自动汇总</h1>
          <p>
            导入学生名单，点击即可标记出勤、迟到、请假与缺勤。支持批量操作、撤销、历史记录与 CSV 导出，
            所有数据自动保存在本地浏览器。
          </p>
          <div class="hero-actions">
            <el-button type="primary" size="large" class="hero-primary" @click="importVisible = true">
              <el-icon><Upload /></el-icon>
              导入学生名单
            </el-button>
            <el-button size="large" class="hero-ghost" @click="exportCurrent">
              <el-icon><Download /></el-icon>
              导出考勤表
            </el-button>
          </div>
        </div>

        <div class="hero-stats">
          <div class="hero-stat">
            <strong>{{ store.students.length }}</strong>
            <span>名单人数</span>
          </div>
          <div class="hero-divider" />
          <div class="hero-stat">
            <strong>{{ store.overview.totalSessions }}</strong>
            <span>已存课次</span>
          </div>
          <div class="hero-divider" />
          <div class="hero-stat">
            <strong>{{ store.overview.avgRate }}<small>%</small></strong>
            <span>平均出勤率</span>
          </div>
        </div>
      </section>

      <div class="content-grid">
        <div class="main-col">
          <StatCards :stats="store.stats" />

          <section ref="workspaceRef" class="workspace">
            <!-- 课程与日期 -->
            <div class="session-bar">
              <div class="session-field">
                <label>课程</label>
                <el-select
                  v-model="store.draft.course"
                  filterable
                  allow-create
                  default-first-option
                  class="course-select"
                >
                  <el-option v-for="course in COURSE_OPTIONS" :key="course" :label="course" :value="course" />
                </el-select>
              </div>
              <div class="session-field">
                <label>上课日期</label>
                <el-date-picker
                  v-model="store.draft.date"
                  type="date"
                  value-format="YYYY-MM-DD"
                  :clearable="false"
                  class="date-picker"
                />
              </div>
              <span class="session-count">
                应到 <b>{{ store.stats.total }}</b> 人 · 已标记
                <b>{{ store.stats.marked }}</b> 人
              </span>
              <div class="session-actions">
                <el-tooltip
                  :content="store.canUndo ? `撤销：${store.lastUndoLabel}` : '暂无可撤销的操作'"
                  placement="top"
                >
                  <el-button :disabled="!store.canUndo" @click="handleUndo">
                    <el-icon><RefreshLeft /></el-icon>
                    撤销
                  </el-button>
                </el-tooltip>
                <el-dropdown trigger="click" @command="handleMore">
                  <el-button class="more-btn">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="sample">载入示例名单</el-dropdown-item>
                      <el-dropdown-item command="clear" divided>清空名单</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>

            <!-- 筛选与快捷操作 -->
            <div class="toolbar">
              <div class="filters">
                <el-input
                  v-model="keyword"
                  placeholder="搜索姓名 / 学号"
                  clearable
                  class="search-input"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-select
                  v-model="classFilter"
                  placeholder="全部班级"
                  clearable
                  class="class-select"
                >
                  <el-option v-for="item in store.classOptions" :key="item" :label="item" :value="item" />
                </el-select>
              </div>

              <div class="quick-actions">
                <el-tooltip :content="`作用于${quickScope}`" placement="top">
                  <el-button type="success" plain @click="markFiltered('present')">全部出勤</el-button>
                </el-tooltip>
                <el-tooltip :content="`作用于${quickScope}`" placement="top">
                  <el-button type="danger" plain @click="markFiltered('absent')">全部缺勤</el-button>
                </el-tooltip>
                <el-button plain @click="resetAll">重置</el-button>
              </div>
            </div>

            <div class="status-filter">
              <button
                v-for="chip in filterChips"
                :key="chip.value"
                type="button"
                class="filter-chip"
                :class="{ active: statusFilter === chip.value }"
                @click="statusFilter = chip.value"
              >
                <span class="chip-dot" :style="{ background: chip.color }" />
                {{ chip.label }}
                <b>{{ chip.count }}</b>
              </button>
            </div>

            <!-- 批量操作条 -->
            <transition name="slide-fade">
              <div v-if="selectedIds.length" class="batch-bar">
                <span class="batch-text">已选 <b>{{ selectedIds.length }}</b> 人</span>
                <div class="batch-actions">
                  <button
                    v-for="status in STATUS_LIST"
                    :key="status.value"
                    type="button"
                    class="batch-btn"
                    :style="{ color: status.color, borderColor: status.color }"
                    @click="markSelected(status.value)"
                  >
                    标记{{ status.label }}
                  </button>
                </div>
                <el-button link @click="clearSelection">取消选择</el-button>
              </div>
            </transition>

            <!-- 学生表格 -->
            <el-table
              ref="tableRef"
              :data="filteredStudents"
              row-key="id"
              class="roster-table"
              :header-cell-style="{ background: '#f8fafd', color: '#64748b', fontWeight: '600' }"
              @selection-change="onSelectionChange"
            >
              <el-table-column type="selection" width="46" reserve-selection />

              <el-table-column label="学生" min-width="200">
                <template #default="{ row }">
                  <div class="student-cell">
                    <span class="avatar">{{ row.name.slice(0, 1) }}</span>
                    <div class="student-text">
                      <strong>{{ row.name }}</strong>
                      <span>{{ row.studentNo }}</span>
                    </div>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="班级" min-width="130">
                <template #default="{ row }">
                  <span v-if="row.className" class="class-tag">{{ row.className }}</span>
                  <span v-else class="text-empty">未填写</span>
                </template>
              </el-table-column>

              <el-table-column label="出勤状态" min-width="300">
                <template #default="{ row }">
                  <div class="status-switch" :title="'再次点击已选状态可取消标记'">
                    <button
                      v-for="status in STATUS_LIST"
                      :key="status.value"
                      type="button"
                      class="status-btn"
                      :class="{ active: store.statusOf(row.id) === status.value }"
                      :style="
                        store.statusOf(row.id) === status.value
                          ? { color: status.color, background: status.bg, borderColor: status.color }
                          : {}
                      "
                      @click="store.setStatus(row.id, status.value)"
                    >
                      <span class="status-dot" :style="{ background: status.color }" />
                      {{ status.label }}
                    </button>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="操作" width="72" align="center">
                <template #default="{ row }">
                  <el-tooltip content="从名单中移除" placement="top">
                    <el-button text class="remove-btn" @click="removeStudent(row)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </el-tooltip>
                </template>
              </el-table-column>

              <template #empty>
                <div v-if="store.students.length" class="empty-state">
                  <el-icon :size="30" class="empty-icon"><Search /></el-icon>
                  <h4>没有符合筛选条件的学生</h4>
                  <p>试试更换关键词、班级或状态筛选。</p>
                  <el-button plain @click="clearFilters">清除筛选</el-button>
                </div>
                <div v-else class="empty-state">
                  <div class="empty-art">
                    <el-icon :size="26"><Plus /></el-icon>
                  </div>
                  <h4>还没有学生名单</h4>
                  <p>粘贴「学号 姓名 班级」名单，或上传 CSV 文件，导入前可预览校验结果。</p>
                  <div class="empty-actions">
                    <el-button type="primary" @click="importVisible = true">导入学生名单</el-button>
                    <el-button @click="handleMore('sample')">载入示例数据</el-button>
                  </div>
                </div>
              </template>
            </el-table>

            <!-- 底部操作栏 -->
            <div class="panel-foot">
              <div class="foot-info">
                <template v-if="store.stats.total && store.stats.unmarked">
                  <span class="unmarked-tip">
                    还有 <b>{{ store.stats.unmarked }}</b> 人未标记
                  </span>
                  <el-button link type="primary" @click="markUnmarkedAbsent">全部记为缺勤</el-button>
                </template>
                <span v-else-if="store.stats.total" class="done-tip">
                  <el-icon><CircleCheck /></el-icon>
                  全部完成标记，可保存本次考勤
                </span>
                <span v-else class="unmarked-tip">导入名单后即可开始点名</span>
              </div>
              <div class="foot-actions">
                <el-button @click="importVisible = true">
                  <el-icon><Plus /></el-icon>
                  添加学生
                </el-button>
                <el-button type="primary" @click="handleSave">保存本次考勤</el-button>
              </div>
            </div>
          </section>
        </div>

        <aside class="side-col">
          <SummaryPanel :stats="store.stats" />
          <HistoryPanel
            :sessions="store.history"
            @view="handleViewFromHistory"
            @remove="removeSession"
            @export="exportSession"
          />
        </aside>
      </div>
    </div>

    <ImportStudentsDialog v-model="importVisible" />

    <!-- 历史考勤明细 -->
    <el-dialog v-model="detailVisible" width="min(720px, 94vw)" top="8vh" class="detail-dialog">
      <template #header>
        <div v-if="activeSession" class="detail-head">
          <div>
            <h3>{{ activeSession.course }}</h3>
            <p>{{ activeSession.date }} · 共 {{ activeSession.stats.total }} 人</p>
          </div>
          <el-tag
            round
            effect="light"
            :type="activeSession.stats.rate >= 80 ? 'success' : 'danger'"
          >
            出勤率 {{ activeSession.stats.rate }}%
          </el-tag>
        </div>
      </template>

      <template v-if="activeSession">
        <div class="detail-stats">
          <div v-for="status in STATUS_LIST" :key="status.value" class="detail-stat">
            <span class="detail-dot" :style="{ background: status.color }" />
            <span class="detail-label">{{ status.label }}</span>
            <strong :style="{ color: status.color }">{{ activeSession.stats[status.value] }}</strong>
          </div>
        </div>

        <el-table :data="activeSession.entries" size="small" max-height="360">
          <el-table-column prop="studentNo" label="学号" width="140" />
          <el-table-column prop="name" label="姓名" width="110" />
          <el-table-column prop="className" label="班级" min-width="130">
            <template #default="{ row }">
              <span v-if="row.className">{{ row.className }}</span>
              <span v-else class="text-empty">未填写</span>
            </template>
          </el-table-column>
          <el-table-column label="考勤状态" width="100">
            <template #default="{ row }">
              <span
                class="status-pill"
                :style="{
                  color: STATUS_MAP[row.status]?.color || UNMARKED.color,
                  background: STATUS_MAP[row.status]?.bg || UNMARKED.bg
                }"
              >
                {{ STATUS_MAP[row.status]?.label || UNMARKED.label }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <template #footer>
        <div class="detail-foot">
          <el-button
            link
            class="detail-danger"
            @click="activeSession && removeSession(activeSession)"
          >
            删除此记录
          </el-button>
          <div>
            <el-button @click="detailVisible = false">关闭</el-button>
            <el-button @click="activeSession && exportSession(activeSession)">导出 CSV</el-button>
            <el-button type="primary" @click="loadActiveSession">载入并继续编辑</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.attendance-page {
  padding: 24px 0 56px;
}

// ===== Hero =====
.page-hero {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  padding: 32px 36px;
  border-radius: 20px;
  color: #fff;
  background: linear-gradient(120deg, #2f7cf6 0%, #4f6ef7 48%, #6d5df6 100%);
  box-shadow: 0 16px 40px rgba(63, 110, 240, 0.28);
  margin-bottom: 20px;

  &::before,
  &::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    pointer-events: none;
  }
  &::before {
    width: 260px;
    height: 260px;
    top: -140px;
    right: 180px;
  }
  &::after {
    width: 180px;
    height: 180px;
    bottom: -120px;
    left: 38%;
  }
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 640px;
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.3px;

  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #7ef0b0;
    box-shadow: 0 0 0 4px rgba(126, 240, 176, 0.22);
  }
}

.hero-content h1 {
  margin: 14px 0 10px;
  font-size: 30px;
  line-height: 1.25;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.hero-content p {
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.85);
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  flex-wrap: wrap;

  :deep(.el-button) {
    height: 42px;
    padding: 0 22px;
    border-radius: 10px !important;
  }
}

.hero-primary {
  color: #2f5fe0 !important;
  background: #fff !important;
  border-color: #fff !important;
  font-weight: 600;

  &:hover {
    background: #f2f6ff !important;
  }
}

.hero-ghost {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.12) !important;
  border-color: rgba(255, 255, 255, 0.4) !important;

  &:hover {
    background: rgba(255, 255, 255, 0.22) !important;
    border-color: rgba(255, 255, 255, 0.7) !important;
  }
}

.hero-stats {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 24px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(6px);
  flex-shrink: 0;
}

.hero-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 72px;

  strong {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;

    small {
      font-size: 14px;
      font-weight: 500;
      margin-left: 1px;
      opacity: 0.8;
    }
  }

  span {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
  }
}

.hero-divider {
  width: 1px;
  height: 34px;
  background: rgba(255, 255, 255, 0.25);
}

// ===== 布局 =====
.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 336px;
  gap: 16px;
  align-items: start;
}

.side-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 80px;
}

.main-col {
  min-width: 0;
}

// ===== 工作区 =====
.workspace {
  background: #fff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 16px 16px 0;
  scroll-margin-top: 84px;
}

.session-bar {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  border-bottom: 1px solid #f1f5f9;
}

.session-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.course-select {
  width: 168px;
}

.date-picker {
  width: 150px;
}

.session-count {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;

  b {
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }
}

.session-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
  margin-bottom: 0;
}

.more-btn {
  width: 34px;
  padding: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 0 10px;
}

.filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.search-input {
  width: 210px;
}

.class-select {
  width: 140px;
}

.quick-actions {
  display: flex;
  gap: 8px;
}

.status-filter {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-bottom: 12px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid #e6ebf3;
  border-radius: 999px;
  background: #fff;
  color: var(--text-regular);
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition-base);

  b {
    font-weight: 600;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  &:hover {
    border-color: #c6d9f7;
    background: #f7faff;
  }

  &.active {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);

    b {
      color: var(--el-color-primary);
    }
  }
}

.chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 10px 14px;
  margin-bottom: 10px;
  border-radius: 10px;
  background: var(--el-color-primary-light-9);
  border: 1px solid #d8e8ff;
}

.batch-text {
  font-size: 13px;
  color: var(--text-regular);

  b {
    color: var(--el-color-primary);
    font-variant-numeric: tabular-nums;
  }
}

.batch-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.batch-btn {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid;
  background: #fff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-base);

  &:hover {
    filter: brightness(0.95);
  }
}

// ===== 表格 =====
.roster-table {
  width: 100%;

  :deep(.el-table__cell) {
    padding: 9px 0;
  }

  :deep(.el-table__row) {
    transition: background 0.2s;
  }

  :deep(.el-table__body tr:hover > td.el-table__cell) {
    background: #f8fbff;
  }
}

.student-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.student-text {
  display: flex;
  flex-direction: column;
  line-height: 1.3;

  strong {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
  }

  span {
    font-size: 11.5px;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }
}

.class-tag {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 6px;
  background: #f4f7fb;
  color: #5b6b82;
  font-size: 12px;
}

.text-empty {
  color: var(--text-placeholder);
  font-size: 12px;
}

.status-switch {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.status-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 8px;
  border: 1px solid #e6ebf3;
  background: #fff;
  color: var(--text-regular);
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition-base);
  user-select: none;

  &:hover {
    border-color: #c6d9f7;
    background: #f8fbff;
  }

  &.active {
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(30, 64, 175, 0.08);
  }
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  opacity: 0.65;

  .status-btn.active & {
    opacity: 1;
  }
}

.remove-btn {
  color: var(--text-placeholder);

  &:hover {
    color: var(--c-absent);
  }
}

.empty-state {
  padding: 36px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  h4 {
    margin: 12px 0 6px;
    font-size: 15px;
    color: var(--text-primary);
  }

  p {
    margin: 0 0 16px;
    max-width: 380px;
    font-size: 13px;
    line-height: 1.7;
    color: var(--text-secondary);
  }
}

.empty-art {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.empty-icon {
  color: var(--text-placeholder);
}

.empty-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

// ===== 底部栏 =====
.panel-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding: 14px 0;
  border-top: 1px solid #f1f5f9;
  margin-top: 4px;
}

.foot-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unmarked-tip {
  font-size: 13px;
  color: var(--text-secondary);

  b {
    color: var(--c-late);
    font-variant-numeric: tabular-nums;
  }
}

.done-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--c-present);
}

.foot-actions {
  display: flex;
  gap: 8px;
}

// ===== 详情弹窗 =====
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  h3 {
    margin: 0 0 4px;
    font-size: 18px;
    color: var(--text-primary);
  }

  p {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.detail-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafd;

  .detail-label {
    flex: 1;
    font-size: 12px;
    color: var(--text-secondary);
  }

  strong {
    font-size: 16px;
    font-variant-numeric: tabular-nums;
  }
}

.detail-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

.detail-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-danger {
  color: var(--c-absent) !important;
}

// ===== 响应式 =====
@media (max-width: 1080px) {
  .content-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .side-col {
    position: static;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }
}

@media (max-width: 900px) {
  .page-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 26px 24px;
  }

  .hero-stats {
    align-self: stretch;
    justify-content: space-around;
  }
}

@media (max-width: 720px) {
  .attendance-page {
    padding: 16px 0 40px;
  }

  .hero-content h1 {
    font-size: 24px;
  }

  .side-col {
    grid-template-columns: minmax(0, 1fr);
  }

  .session-count {
    margin-bottom: 0;
  }

  .session-actions {
    margin-left: 0;
  }

  .search-input {
    width: 100%;
  }

  .filters {
    width: 100%;
  }

  .class-select {
    width: 100%;
  }

  .quick-actions {
    width: 100%;
  }

  .quick-actions :deep(.el-button) {
    flex: 1;
  }

  .detail-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .panel-foot {
    align-items: flex-start;
    flex-direction: column;
  }

  .foot-actions {
    width: 100%;
  }

  .foot-actions :deep(.el-button) {
    flex: 1;
  }
}
</style>
