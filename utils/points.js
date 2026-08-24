/**
 * 积分 / 签到 / 账本（本地存储，单对象 pointsData）
 *
 * 规则：
 *   100 积分 = 1 元
 *   每日签到 +5 积分
 *   结算页可全量抵扣（不超过商品金额）
 */
const POINTS_KEY = 'pointsData'
const RATE = 100 // 100 积分 = 1 元
const POINTS_PER_CHECKIN = 5

const DEFAULT = {
  balance: 0,
  totalDays: 0,
  lastCheckDate: '',
  records: [], // [{ date: 'YYYY-MM-DD', points }] 最新在前
  ledger: [] // [{ time: 'YYYY-MM-DD HH:mm:ss', points: ±N, desc }] 最新在前
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

function nowStr() {
  const d = new Date()
  return todayStr() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

function getPoints() {
  return Object.assign({}, DEFAULT, wx.getStorageSync(POINTS_KEY) || {})
}

function savePoints(p) {
  wx.setStorageSync(POINTS_KEY, p)
}

// 首次启动预置积分（保证结算页积分抵扣可演示）
function ensureSeed() {
  if (wx.getStorageSync(POINTS_KEY)) return
  savePoints({
    balance: 200,
    totalDays: 0,
    lastCheckDate: '',
    records: [],
    ledger: [{ time: nowStr(), points: 200, desc: '新用户奖励' }]
  })
}

function isCheckedToday() {
  return getPoints().lastCheckDate === todayStr()
}

// 每日签到：当天未签则 +POINTS_PER_CHECKIN
function checkIn() {
  const p = getPoints()
  if (p.lastCheckDate === todayStr()) {
    return { ok: false, checked: true, points: 0, totalDays: p.totalDays }
  }
  const date = todayStr()
  const next = Object.assign({}, p, {
    balance: p.balance + POINTS_PER_CHECKIN,
    totalDays: p.totalDays + 1,
    lastCheckDate: date,
    records: [{ date, points: POINTS_PER_CHECKIN }].concat(p.records),
    ledger: [{ time: nowStr(), points: POINTS_PER_CHECKIN, desc: '每日签到' }].concat(p.ledger)
  })
  savePoints(next)
  return { ok: true, checked: false, points: POINTS_PER_CHECKIN, totalDays: next.totalDays }
}

function getBalance() {
  return getPoints().balance
}

function addPoints(pts, desc) {
  const p = getPoints()
  const next = Object.assign({}, p, {
    balance: p.balance + pts,
    ledger: [{ time: nowStr(), points: pts, desc }].concat(p.ledger)
  })
  savePoints(next)
}

function deductPoints(pts, desc) {
  const p = getPoints()
  if (p.balance < pts) return false
  const next = Object.assign({}, p, {
    balance: p.balance - pts,
    ledger: [{ time: nowStr(), points: -pts, desc }].concat(p.ledger)
  })
  savePoints(next)
  return true
}

// 纯函数：结算页积分抵扣计算（不可用时不抵扣，返回可抵扣信息）
function calcPointsDiscount(goodsAmount, balance) {
  const usablePoints = Math.min(balance, Math.floor(goodsAmount * RATE))
  const pointsAmount = Math.floor(usablePoints / RATE)
  return {
    usablePoints,
    pointsAmount,
    canUse: usablePoints >= RATE
  }
}

module.exports = {
  getPoints,
  savePoints,
  ensureSeed,
  checkIn,
  isCheckedToday,
  getBalance,
  addPoints,
  deductPoints,
  calcPointsDiscount,
  todayStr,
  RATE,
  POINTS_PER_CHECKIN
}
