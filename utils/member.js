/**
 * 会员等级体系（本地存储，单对象 memberData）
 *
 * 等级：普通会员(1) → 银卡(2) → 金卡(3) → 钻石(4)
 * 成长值：消费1元=1成长值，签到+5，评价+10
 * 权益：折扣、专属优惠券、免运费、优先发货
 */
const MEMBER_KEY = 'memberData'

const LEVELS = [
  { level: 1, name: '普通会员', minGrowth: 0, discount: 1, icon: '👤', color: '#999999' },
  { level: 2, name: '银卡会员', minGrowth: 500, discount: 0.98, icon: '🥈', color: '#C0C0C0' },
  { level: 3, name: '金卡会员', minGrowth: 2000, discount: 0.95, icon: '🥇', color: '#FFD700' },
  { level: 4, name: '钻石会员', minGrowth: 5000, discount: 0.92, icon: '💎', color: '#00BFFF' }
]

const BENEFITS = {
  1: { freeShipping: false, couponMonthly: 1, priorityShip: false, exclusiveSale: false },
  2: { freeShipping: false, couponMonthly: 5, priorityShip: false, exclusiveSale: false },
  3: { freeShipping: true, couponMonthly: 10, priorityShip: false, exclusiveSale: true },
  4: { freeShipping: true, couponMonthly: 20, priorityShip: true, exclusiveSale: true }
}

const DEFAULT = {
  level: 1,
  growth: 0,
  totalConsumed: 0,
  memberNo: '',
  joinTime: 0,
  growthLedger: [] // [{ time, points, desc }] 最新在前
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function nowStr() {
  const d = new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

function generateMemberNo() {
  const d = new Date()
  return 'VIP' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
    pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())
}

function getMember() {
  return Object.assign({}, DEFAULT, wx.getStorageSync(MEMBER_KEY) || {})
}

function saveMember(m) {
  wx.setStorageSync(MEMBER_KEY, m)
}

// 首次启动预置会员数据
function ensureSeed() {
  if (wx.getStorageSync(MEMBER_KEY)) return
  saveMember({
    level: 1,
    growth: 100,
    totalConsumed: 0,
    memberNo: generateMemberNo(),
    joinTime: Date.now(),
    growthLedger: [{ time: nowStr(), points: 100, desc: '新用户注册奖励' }]
  })
}

// 根据成长值计算等级
function calcLevel(growth) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (growth >= LEVELS[i].minGrowth) return LEVELS[i]
  }
  return LEVELS[0]
}

// 获取当前等级信息
function getCurrentLevel() {
  const m = getMember()
  return calcLevel(m.growth)
}

// 获取下一等级信息
function getNextLevel() {
  const current = getCurrentLevel()
  if (current.level >= LEVELS.length) return null
  return LEVELS[current.level]
}

// 计算距离下一等级的成长值
function getGrowthToNextLevel() {
  const m = getMember()
  const next = getNextLevel()
  if (!next) return 0
  return Math.max(0, next.minGrowth - m.growth)
}

// 获取成长值进度百分比（当前等级内）
function getGrowthProgress() {
  const m = getMember()
  const current = getCurrentLevel()
  const next = getNextLevel()
  if (!next) return 100
  const currentMin = current.minGrowth
  const nextMin = next.minGrowth
  const progress = ((m.growth - currentMin) / (nextMin - currentMin)) * 100
  return Math.min(100, Math.max(0, progress))
}

// 增加成长值
function addGrowth(points, desc) {
  const m = getMember()
  const oldLevel = calcLevel(m.growth).level
  const newGrowth = m.growth + points
  const newLevel = calcLevel(newGrowth).level

  const next = Object.assign({}, m, {
    growth: newGrowth,
    growthLedger: [{ time: nowStr(), points, desc }].concat(m.growthLedger)
  })
  saveMember(next)

  // 返回是否升级
  return {
    upgraded: newLevel > oldLevel,
    oldLevel,
    newLevel,
    newLevelInfo: calcLevel(newGrowth)
  }
}

// 增加消费金额（同时增加成长值）
function addConsumption(amount) {
  const m = getMember()
  const next = Object.assign({}, m, {
    totalConsumed: m.totalConsumed + amount
  })
  saveMember(next)
  return addGrowth(amount, '消费赠送')
}

// 获取等级折扣
function getLevelDiscount(level) {
  const l = LEVELS.find(item => item.level === level)
  return l ? l.discount : 1
}

// 获取当前折扣
function getCurrentDiscount() {
  const current = getCurrentLevel()
  return current.discount
}

// 计算会员折扣价
function calcMemberPrice(originalPrice) {
  const discount = getCurrentDiscount()
  return Math.round(originalPrice * discount * 100) / 100
}

// 获取等级权益
function getLevelBenefits(level) {
  return BENEFITS[level] || BENEFITS[1]
}

// 获取当前权益
function getCurrentBenefits() {
  const current = getCurrentLevel()
  return getLevelBenefits(current.level)
}

// 检查是否免运费
function isFreeShipping() {
  return getCurrentBenefits().freeShipping
}

// 获取成长值明细
function getGrowthLedger() {
  return getMember().growthLedger
}

// 获取会员信息（用于展示）
function getMemberInfo() {
  const m = getMember()
  const current = getCurrentLevel()
  const next = getNextLevel()
  return {
    level: m.level,
    levelName: current.name,
    levelIcon: current.icon,
    levelColor: current.color,
    growth: m.growth,
    nextLevel: next ? next.name : '已满级',
    nextGrowth: next ? next.minGrowth : m.growth,
    growthToNext: getGrowthToNextLevel(),
    progress: getGrowthProgress(),
    discount: current.discount,
    benefits: getCurrentBenefits(),
    memberNo: m.memberNo,
    joinTime: m.joinTime,
    totalConsumed: m.totalConsumed
  }
}

// 获取所有等级配置（用于等级说明页）
function getAllLevels() {
  return LEVELS.map(l => ({
    ...l,
    benefits: getLevelBenefits(l.level)
  }))
}

module.exports = {
  getMember,
  saveMember,
  ensureSeed,
  getCurrentLevel,
  getNextLevel,
  getGrowthToNextLevel,
  getGrowthProgress,
  addGrowth,
  addConsumption,
  getLevelDiscount,
  getCurrentDiscount,
  calcMemberPrice,
  getLevelBenefits,
  getCurrentBenefits,
  isFreeShipping,
  getGrowthLedger,
  getMemberInfo,
  getAllLevels,
  LEVELS,
  BENEFITS
}
