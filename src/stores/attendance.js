import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

// 考勤状态字典：全站统一使用，保证颜色与文案一致
export const STATUS_LIST = [
  { value: 'present', label: '出勤', short: '勤', color: '#16a34a', bg: '#e9f9ef' },
  { value: 'late', label: '迟到', short: '迟', color: '#d97706', bg: '#fff5e6' },
  { value: 'leave', label: '请假', short: '假', color: '#2563eb', bg: '#eaf1ff' },
  { value: 'absent', label: '缺勤', short: '缺', color: '#dc2626', bg: '#fdecec' }
]

export const STATUS_MAP = STATUS_LIST.reduce((map, item) => {
  map[item.value] = item
  return map
}, {})

export const UNMARKED = {
  value: 'unmarked',
  label: '未标记',
  short: '—',
  color: '#94a3b8',
  bg: '#f1f5f9'
}

export const COURSE_OPTIONS = ['数据结构', '操作系统', '计算机网络', '高等数学', '大学英语']

const STORAGE_KEY = 'classroom-attendance-v1'
const MAX_UNDO = 20

function today() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const pad = (num) => String(num).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

// 出勤率 = (出勤 + 迟到) / 应到人数
export function summarize(entries = []) {
  const counts = { present: 0, late: 0, leave: 0, absent: 0, unmarked: 0 }
  entries.forEach((entry) => {
    const key = counts[entry.status] === undefined ? 'unmarked' : entry.status
    counts[key] += 1
  })
  const total = entries.length
  const arrived = counts.present + counts.late
  return {
    ...counts,
    total,
    arrived,
    marked: total - counts.unmarked,
    rate: total ? Math.round((arrived / total) * 100) : 0
  }
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const SAMPLE_ROSTER = [
  ['2023010101', '林清越', '计算机 2301'],
  ['2023010102', '陈以南', '计算机 2301'],
  ['2023010103', '周斯年', '计算机 2301'],
  ['2023010104', '沈知夏', '计算机 2301'],
  ['2023010105', '顾言', '计算机 2301'],
  ['2023010106', '苏晚', '计算机 2301'],
  ['2023010107', '何砚', '计算机 2301'],
  ['2023010108', '江屿', '计算机 2301'],
  ['2023020201', '许星野', '软件工程 2302'],
  ['2023020202', '唐稚', '软件工程 2302'],
  ['2023020203', '谢屿', '软件工程 2302'],
  ['2023020204', '白露', '软件工程 2302'],
  ['2023020205', '傅时', '软件工程 2302'],
  ['2023020206', '温言', '软件工程 2302'],
  ['2023020207', '宋知微', '软件工程 2302'],
  ['2023020208', '陆行舟', '软件工程 2302'],
  ['2023020209', '叶青', '软件工程 2302'],
  ['2023020210', '程澈', '软件工程 2302']
]

export const useAttendanceStore = defineStore('attendance', () => {
  const cached = readStorage()

  const students = ref(cached?.students || [])
  const sessions = ref(cached?.sessions || [])
  const draft = ref({
    course: cached?.draft?.course || COURSE_OPTIONS[0],
    date: cached?.draft?.date || today(),
    records: cached?.draft?.records || {}
  })
  const undoStack = ref([])

  const statusOf = (studentId) => draft.value.records[studentId] || 'unmarked'

  const stats = computed(() =>
    summarize(students.value.map((student) => ({ status: statusOf(student.id) })))
  )

  const classOptions = computed(() => {
    const set = new Set(students.value.map((s) => s.className).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  })

  const canUndo = computed(() => undoStack.value.length > 0)
  const lastUndoLabel = computed(() => undoStack.value[undoStack.value.length - 1]?.label || '')

  const overview = computed(() => {
    const totalSessions = sessions.value.length
    const avgRate = totalSessions
      ? Math.round(
          sessions.value.reduce((sum, session) => sum + summarize(session.entries).rate, 0) /
            totalSessions
        )
      : 0
    return { totalSessions, avgRate }
  })

  const history = computed(() =>
    sessions.value
      .map((session) => ({ ...session, stats: summarize(session.entries) }))
      .sort((a, b) => (b.date + b.savedAt).localeCompare(a.date + a.savedAt))
  )

  function pushUndo(label) {
    undoStack.value.push({
      label,
      course: draft.value.course,
      date: draft.value.date,
      records: { ...draft.value.records },
      students: students.value.map((student) => ({ ...student }))
    })
    if (undoStack.value.length > MAX_UNDO) undoStack.value.shift()
  }

  function undo() {
    const snapshot = undoStack.value.pop()
    if (!snapshot) return null
    students.value = snapshot.students
    draft.value.records = snapshot.records
    draft.value.course = snapshot.course
    draft.value.date = snapshot.date
    return snapshot.label
  }

  function setStatus(studentId, status) {
    const current = statusOf(studentId)
    const next = current === status ? 'unmarked' : status
    const label =
      next === 'unmarked'
        ? `取消 ${students.value.find((s) => s.id === studentId)?.name || ''} 的标记`
        : `标记${STATUS_MAP[status].label}`
    pushUndo(label)
    if (next === 'unmarked') {
      delete draft.value.records[studentId]
    } else {
      draft.value.records[studentId] = next
    }
  }

  function markMany(studentIds, status, label) {
    if (!studentIds.length) return 0
    pushUndo(label)
    studentIds.forEach((id) => {
      if (status === 'unmarked') {
        delete draft.value.records[id]
      } else {
        draft.value.records[id] = status
      }
    })
    return studentIds.length
  }

  function resetRecords() {
    if (!Object.keys(draft.value.records).length) return false
    pushUndo('重置本次标记')
    draft.value.records = {}
    return true
  }

  function addStudent({ studentNo, name, className }) {
    const no = String(studentNo || '').trim()
    const nm = String(name || '').trim()
    const cls = String(className || '').trim()

    if (!nm) return { ok: false, message: '请填写学生姓名' }
    if (!no) return { ok: false, message: '请填写学号' }
    if (!/^[A-Za-z0-9-]{3,20}$/.test(no)) {
      return { ok: false, message: '学号应为 3-20 位数字或字母' }
    }
    if (students.value.some((s) => s.studentNo === no)) {
      return { ok: false, message: `学号 ${no} 已存在于名单中` }
    }

    pushUndo(`添加学生 ${nm}`)
    students.value.push({ id: uid('stu'), studentNo: no, name: nm, className: cls })
    return { ok: true, student: students.value[students.value.length - 1] }
  }

  function importStudents(list) {
    if (!list?.length) return { added: 0, skipped: 0 }
    const existing = new Set(students.value.map((s) => s.studentNo))
    const added = []
    let skipped = 0

    list.forEach((item) => {
      const no = String(item.studentNo || '').trim()
      const nm = String(item.name || '').trim()
      if (!no || !nm || existing.has(no)) {
        skipped += 1
        return
      }
      existing.add(no)
      added.push({
        id: uid('stu'),
        studentNo: no,
        name: nm,
        className: String(item.className || '').trim()
      })
    })

    if (added.length) {
      pushUndo(`导入 ${added.length} 名学生`)
      students.value.push(...added)
    }
    return { added: added.length, skipped }
  }

  function removeStudents(ids) {
    if (!ids.length) return 0
    const target = new Set(ids)
    pushUndo(`移除 ${ids.length} 名学生`)
    students.value = students.value.filter((student) => !target.has(student.id))
    ids.forEach((id) => delete draft.value.records[id])
    return ids.length
  }

  function clearRoster() {
    if (!students.value.length) return false
    pushUndo('清空学生名单')
    students.value = []
    draft.value.records = {}
    return true
  }

  function saveSession() {
    if (!students.value.length) {
      return { ok: false, message: '请先导入学生名单' }
    }

    // 未标记的学生按缺勤计入，确保统计口径一致
    let converted = 0
    students.value.forEach((student) => {
      if (!draft.value.records[student.id]) {
        draft.value.records[student.id] = 'absent'
        converted += 1
      }
    })

    const entries = students.value.map((student) => ({
      studentNo: student.studentNo,
      name: student.name,
      className: student.className,
      status: statusOf(student.id)
    }))

    const existing = sessions.value.find(
      (session) => session.course === draft.value.course && session.date === draft.value.date
    )
    const payload = {
      id: existing?.id || uid('ses'),
      course: draft.value.course,
      date: draft.value.date,
      entries,
      savedAt: new Date().toISOString()
    }

    if (existing) {
      Object.assign(existing, payload)
    } else {
      sessions.value.push(payload)
    }

    return { ok: true, updated: Boolean(existing), converted, entries }
  }

  function deleteSession(sessionId) {
    const index = sessions.value.findIndex((session) => session.id === sessionId)
    if (index === -1) return false
    sessions.value.splice(index, 1)
    return true
  }

  function loadSession(session) {
    pushUndo(`载入 ${session.course} · ${session.date}`)
    draft.value.course = session.course
    draft.value.date = session.date

    const byNo = new Map(students.value.map((student) => [student.studentNo, student]))
    const records = {}

    session.entries.forEach((entry) => {
      let student = byNo.get(entry.studentNo)
      if (!student) {
        student = {
          id: uid('stu'),
          studentNo: entry.studentNo,
          name: entry.name,
          className: entry.className
        }
        students.value.push(student)
        byNo.set(entry.studentNo, student)
      }
      if (entry.status && entry.status !== 'unmarked') {
        records[student.id] = entry.status
      }
    })

    draft.value.records = records
  }

  function buildCsv(session) {
    const entries =
      session?.entries ||
      students.value.map((student) => ({
        studentNo: student.studentNo,
        name: student.name,
        className: student.className,
        status: statusOf(student.id)
      }))
    const course = session?.course || draft.value.course
    const date = session?.date || draft.value.date

    const rows = [
      ['学号', '姓名', '班级', '考勤状态', '课程', '日期'],
      ...entries.map((entry) => [
        entry.studentNo,
        entry.name,
        entry.className || '',
        STATUS_MAP[entry.status]?.label || UNMARKED.label,
        course,
        date
      ])
    ]

    return rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
  }

  function exportCsv(session) {
    // BOM 让 Excel 正确识别中文
    const csv = `\ufeff${buildCsv(session)}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${session?.course || draft.value.course}-${session?.date || draft.value.date}-考勤表.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function loadSample() {
    pushUndo('载入示例数据')

    const list = SAMPLE_ROSTER.map(([studentNo, name, className]) => ({
      id: uid('stu'),
      studentNo,
      name,
      className
    }))
    students.value = list

    // 模拟一节已点名的课，便于直接体验统计效果
    const records = {}
    list.forEach((student, index) => {
      if (index % 9 === 3) records[student.id] = 'late'
      else if (index % 13 === 7) records[student.id] = 'leave'
      else if (index === list.length - 2) records[student.id] = 'absent'
      else if (index !== list.length - 5) records[student.id] = 'present'
    })
    draft.value.records = records
    draft.value.course = COURSE_OPTIONS[0]
    draft.value.date = today()

    const sampleSession = (course, date, offset) => ({
      id: uid('ses'),
      course,
      date,
      entries: list.map((student, index) => ({
        studentNo: student.studentNo,
        name: student.name,
        className: student.className,
        status:
          (index + offset) % 11 === 2
            ? 'late'
            : (index + offset) % 17 === 6
              ? 'leave'
              : (index + offset) % 19 === 9
                ? 'absent'
                : 'present'
      })),
      savedAt: new Date().toISOString()
    })

    // 仅在还没有历史记录时补充示例课次，避免重复载入产生重复数据
    if (!sessions.value.length) {
      sessions.value = [
        sampleSession(COURSE_OPTIONS[0], daysAgo(7), 0),
        sampleSession(COURSE_OPTIONS[1], daysAgo(3), 4)
      ]
    }

    return { added: list.length }
  }

  watch(
    [students, sessions, draft],
    () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            students: students.value,
            sessions: sessions.value,
            draft: draft.value
          })
        )
      } catch {
        // 存储空间不足或隐私模式时静默失败，不阻塞课堂使用
      }
    },
    { deep: true }
  )

  return {
    students,
    sessions,
    draft,
    stats,
    classOptions,
    canUndo,
    lastUndoLabel,
    overview,
    history,
    statusOf,
    setStatus,
    markMany,
    resetRecords,
    addStudent,
    importStudents,
    removeStudents,
    clearRoster,
    saveSession,
    deleteSession,
    loadSession,
    exportCsv,
    buildCsv,
    loadSample,
    undo
  }
})
