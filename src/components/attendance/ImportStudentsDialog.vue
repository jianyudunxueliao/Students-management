<script setup>
import { computed, reactive, ref, watch } from 'vue'
import {
  CircleCheck,
  Document,
  EditPen,
  Upload,
  UploadFilled,
  Warning
} from '@element-plus/icons-vue'
import { useAttendanceStore } from '@/stores/attendance'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const store = useAttendanceStore()

const activeTab = ref('paste')
const pasteText = ref('')
const uploadRows = ref([])
const fileName = ref('')
const manualAdded = ref(0)
const manual = reactive({ studentNo: '', name: '', className: '' })

const SAMPLE_TEXT = `2023010101,林清越,计算机 2301
2023010102,陈以南,计算机 2301
2023010103,周斯年,计算机 2302`

// 仅当整格内容就是表头词时才跳过首行，避免把「测试班级」这类班级名误判为表头
const HEADER_CELL = /^(序号|编号|学号|姓名|名字|班级|性别|电话|手机号|学生姓名|学生学号)$/

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      activeTab.value = 'paste'
      pasteText.value = ''
      uploadRows.value = []
      fileName.value = ''
      manualAdded.value = 0
      manual.studentNo = ''
      manual.name = ''
      manual.className = ''
    }
  }
)

function cleanCell(cell) {
  return String(cell ?? '')
    .trim()
    .replace(/^"(.*)"$/, '$1')
    .trim()
}

// 按逗号解析时兼容双引号包裹的字段
function splitCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells
}

function splitCells(line) {
  if (line.includes('\t')) return line.split('\t')
  if (line.includes(',')) return splitCsvLine(line)
  if (line.includes('，')) return line.split('，')
  if (line.includes(';') || line.includes('；')) return line.split(/[;；]/)
  return line.split(/\s+/)
}

/**
 * 解析名单文本，返回带校验结果的预览行。
 * 支持 "学号 姓名 班级"，也兼容 "姓名 学号" 的顺序。
 */
function parseRoster(text) {
  if (!text || !text.trim()) return []

  const existingNos = new Set(store.students.map((student) => student.studentNo))
  const seen = new Set()
  const rows = []
  let isFirstRow = true

  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      let cells = splitCells(line).map(cleanCell)
      while (cells.length && !cells[cells.length - 1]) cells.pop()
      while (cells.length && !cells[0]) cells.shift()
      if (!cells.length) return

      if (isFirstRow) {
        isFirstRow = false
        // 首行是表头（如：学号,姓名,班级）时跳过
        if (cells.some((cell) => HEADER_CELL.test(cell))) {
          return
        }
      }

      // 兼容带 "序号" 列：1,2023010101,张三,计算机2301
      if (cells.length >= 4 && /^\d{1,3}$/.test(cells[0])) {
        cells = cells.slice(1)
      }

      let studentNo = ''
      let name = ''
      let className = ''

      if (cells.length >= 3) {
        studentNo = cells[0]
        name = cells[1]
        // 班级名称可能包含空格（如「计算机 2301」），合并剩余列
        className = cells.slice(2).join(' ')
      } else if (cells.length === 2) {
        if (/^\d{4,}$/.test(cells[0])) {
          studentNo = cells[0]
          name = cells[1]
        } else if (/^\d{4,}$/.test(cells[1])) {
          studentNo = cells[1]
          name = cells[0]
        } else {
          name = cells[0]
          className = cells[1]
        }
      } else {
        name = cells[0]
      }

      const reasons = []
      if (!name) reasons.push('缺少姓名')
      if (!studentNo) reasons.push('缺少学号')
      else if (!/^[A-Za-z0-9-]{3,20}$/.test(studentNo)) reasons.push('学号格式不正确')
      if (name && name.length > 20) reasons.push('姓名过长')
      if (studentNo && existingNos.has(studentNo)) reasons.push('名单中已存在')
      if (studentNo && seen.has(studentNo)) reasons.push('文件内学号重复')
      if (studentNo) seen.add(studentNo)

      rows.push({
        studentNo,
        name,
        className,
        valid: reasons.length === 0,
        reason: reasons.join('，')
      })
    })

  return rows
}

const pasteRows = computed(() => parseRoster(pasteText.value))
const rows = computed(() => (activeTab.value === 'upload' ? uploadRows.value : pasteRows.value))
const validRows = computed(() => rows.value.filter((row) => row.valid))
const invalidCount = computed(() => rows.value.length - validRows.value.length)

function fillSample() {
  pasteText.value = SAMPLE_TEXT
}

function readFile(file) {
  if (!/\.(csv|txt)$/i.test(file.name)) {
    ElMessage.error('仅支持 CSV 或 TXT 文件')
    return
  }
  const reader = new FileReader()
  reader.onload = (event) => {
    let text = ''
    try {
      // 先按 UTF-8 严格解码，失败时回退 GBK（兼容 Excel 导出的中文 CSV）
      text = new TextDecoder('utf-8', { fatal: true }).decode(event.target.result)
    } catch {
      text = new TextDecoder('gbk').decode(event.target.result)
    }
    uploadRows.value = parseRoster(text)
    fileName.value = file.name
    if (!uploadRows.value.length) {
      ElMessage.warning('文件内容为空，请检查后重试')
      return
    }
    if (!uploadRows.value.some((row) => row.valid)) {
      ElMessage.warning('没有解析到可导入的学生，请检查格式')
    }
  }
  reader.readAsArrayBuffer(file)
}

function onFileChange(uploadFile) {
  if (uploadFile?.raw) readFile(uploadFile.raw)
}

function confirmImport() {
  if (!validRows.value.length) return
  const result = store.importStudents(validRows.value)
  if (result.added) {
    ElMessage.success(
      result.skipped
        ? `成功导入 ${result.added} 名学生，跳过 ${result.skipped} 名重复学生`
        : `成功导入 ${result.added} 名学生`
    )
    visible.value = false
  } else {
    ElMessage.warning('没有新增学生，请检查名单是否重复')
  }
}

function addManual() {
  const result = store.addStudent(manual)
  if (!result.ok) {
    ElMessage.warning(result.message)
    return
  }
  manualAdded.value += 1
  ElMessage.success(`已添加 ${result.student.name}`)
  manual.studentNo = ''
  manual.name = ''
}

function rowClass({ row }) {
  return row.valid ? '' : 'invalid-row'
}

function close() {
  visible.value = false
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="min(780px, 94vw)"
    top="6vh"
    class="import-dialog"
    :close-on-click-modal="false"
  >
    <template #header>
      <div class="dialog-head">
        <span class="head-icon">
          <el-icon :size="20"><Upload /></el-icon>
        </span>
        <div class="head-text">
          <h3>导入学生名单</h3>
          <p>粘贴、上传文件或手动添加，导入前可预览校验结果</p>
        </div>
      </div>
    </template>

    <el-tabs v-model="activeTab" class="import-tabs">
      <el-tab-pane name="paste">
        <template #label>
          <span class="tab-label"><el-icon><Document /></el-icon>粘贴名单</span>
        </template>

        <div class="format-tip">
          <span>每行一名学生，支持</span>
          <code>学号 姓名 班级</code>
          <span>或</span>
          <code>学号,姓名,班级</code>
          <el-button link type="primary" class="sample-btn" @click="fillSample">填入示例</el-button>
        </div>

        <el-input
          v-model="pasteText"
          type="textarea"
          :rows="8"
          resize="none"
          class="paste-input"
          placeholder="2023010101 林清越 计算机 2301&#10;2023010102 陈以南 计算机 2301&#10;…&#10;（首行表头会自动跳过）"
        />
      </el-tab-pane>

      <el-tab-pane name="upload">
        <template #label>
          <span class="tab-label"><el-icon><UploadFilled /></el-icon>上传文件</span>
        </template>

        <el-upload
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept=".csv,.txt"
          :on-change="onFileChange"
          class="upload-area"
        >
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <div class="el-upload__text">拖拽 CSV / TXT 文件到这里，或 <em>点击选择</em></div>
          <template #tip>
            <p class="upload-tip">支持 UTF-8 与 GBK 编码，自动识别逗号、制表符分隔</p>
          </template>
        </el-upload>

        <div v-if="fileName" class="file-chip">
          <el-icon><Document /></el-icon>
          <span>{{ fileName }}</span>
          <el-tag v-if="rows.length" size="small" round>解析 {{ rows.length }} 行</el-tag>
        </div>
      </el-tab-pane>

      <el-tab-pane name="manual">
        <template #label>
          <span class="tab-label"><el-icon><EditPen /></el-icon>手动添加</span>
        </template>

        <div class="manual-form">
          <el-input v-model="manual.studentNo" placeholder="学号，如 2023010101" clearable />
          <el-input v-model="manual.name" placeholder="姓名" clearable />
          <el-select
            v-model="manual.className"
            placeholder="班级（可输入新建）"
            filterable
            allow-create
            default-first-option
            clearable
          >
            <el-option
              v-for="item in store.classOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
          <el-button type="primary" @click="addManual">添加</el-button>
        </div>
        <p class="manual-tip">
          适合临时补录个别学生，添加后会立即出现在名单中，可连续添加。
        </p>
      </el-tab-pane>
    </el-tabs>

    <template v-if="activeTab !== 'manual'">
      <div v-if="rows.length" class="preview-head">
        <span class="preview-title">解析预览</span>
        <div class="preview-counts">
          <el-tag type="success" size="small" round effect="light">
            可导入 {{ validRows.length }}
          </el-tag>
          <el-tag v-if="invalidCount" type="danger" size="small" round effect="light">
            异常 {{ invalidCount }}
          </el-tag>
        </div>
      </div>
      <el-table
        v-if="rows.length"
        :data="rows"
        size="small"
        max-height="260"
        class="preview-table"
        :row-class-name="rowClass"
      >
        <el-table-column type="index" label="#" width="48" />
        <el-table-column label="学号" width="130">
          <template #default="{ row }">
            <span :class="{ 'text-empty': !row.studentNo }">{{ row.studentNo || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="姓名" width="100">
          <template #default="{ row }">
            <span :class="{ 'text-empty': !row.name }">{{ row.name || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="班级" min-width="130">
          <template #default="{ row }">
            <span :class="{ 'text-empty': !row.className }">{{ row.className || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="校验结果" min-width="170">
          <template #default="{ row }">
            <span v-if="row.valid" class="check pass">
              <el-icon><CircleCheck /></el-icon>可导入
            </span>
            <span v-else class="check fail">
              <el-icon><Warning /></el-icon>{{ row.reason }}
            </span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-else
        :image-size="72"
        description="粘贴名单或上传文件后，这里会显示解析预览"
        class="preview-empty"
      />
    </template>

    <template #footer>
      <div class="dialog-foot">
        <span class="foot-hint">
          <template v-if="activeTab === 'manual'">本次已添加 {{ manualAdded }} 人</template>
          <template v-else-if="rows.length">将导入 {{ validRows.length }} 名学生</template>
          <template v-else>等待名单数据…</template>
        </span>
        <div class="foot-actions">
          <el-button @click="close">{{ activeTab === 'manual' ? '完成' : '取消' }}</el-button>
          <el-button
            v-if="activeTab !== 'manual'"
            type="primary"
            :disabled="!validRows.length"
            @click="confirmImport"
          >
            导入 {{ validRows.length }} 名学生
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.dialog-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.head-icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #409eff, #6366f1);
  box-shadow: 0 6px 14px rgba(64, 158, 255, 0.3);
}

.head-text {
  h3 {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
  }
  p {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.import-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 16px;
  }
  :deep(.el-tabs__item) {
    height: 40px;
    font-size: 14px;
  }
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.format-tip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--text-secondary);

  code {
    padding: 2px 8px;
    border-radius: 6px;
    background: #f1f5f9;
    color: #475569;
    font-size: 12px;
  }
}

.sample-btn {
  margin-left: auto;
  font-size: 13px;
}

.paste-input {
  :deep(.el-textarea__inner) {
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 13px;
    line-height: 1.8;
    background: #fafbfd;
  }
}

.upload-area {
  :deep(.el-upload) {
    width: 100%;
  }
  :deep(.el-upload-dragger) {
    padding: 28px 16px;
    border-radius: 12px;
    background: #fafbfd;
  }
}

.upload-icon {
  font-size: 40px;
  color: #a8c6ff;
  margin-bottom: 8px;
}

.upload-tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}

.file-chip {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #f1f5f9;
  font-size: 13px;
  color: var(--text-regular);
}

.manual-form {
  display: grid;
  grid-template-columns: 1.1fr 0.8fr 1fr auto;
  gap: 10px;
}

.manual-tip {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0 10px;
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.preview-counts {
  display: flex;
  gap: 8px;
}

.preview-table {
  border-radius: 10px;
  overflow: hidden;

  :deep(.invalid-row) {
    background: #fff8f8;
  }
  :deep(.el-table__cell) {
    padding: 7px 0;
  }
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;

  &.pass {
    color: var(--c-present);
  }
  &.fail {
    color: var(--c-absent);
  }
}

.text-empty {
  color: var(--text-placeholder);
}

.preview-empty {
  padding: 8px 0;
}

.dialog-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.foot-hint {
  font-size: 13px;
  color: var(--text-secondary);
}

.foot-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 640px) {
  .manual-form {
    grid-template-columns: 1fr;
  }
}
</style>
