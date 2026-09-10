/**
 * 分销功能（本地存储，单对象 distributionData）
 *
 * 功能：分销员申请、佣金计算、分销关系、收益提现
 */
const DIST_KEY = 'distributionData'

const DEFAULT = {
  // 分销员配置
  config: {
    minWithdraw: 10, // 最低提现金额
    commissionRate: 0.1, // 佣金比例 10%
    secondLevelRate: 0.05, // 二级佣金 5%
    applyCondition: '任意用户可申请'
  },
  // 分销员列表
  agents: [
    {
      agentId: 'agent_001',
      userId: 'user_001',
      name: '分销达人A',
      phone: '13800138001',
      status: 1, // 0待审核 1已通过 2已拒绝
      level: 1, // 1一级分销 2二级分销
      parentId: '', // 上级分销员
      totalCommission: 1280.50,
      availableCommission: 680.50,
      frozenCommission: 200,
      withdrawnCommission: 400,
      teamCount: 15, // 团队人数
      orderCount: 48, // 推广订单数
      applyTime: '2024-01-10',
      auditTime: '2024-01-11'
    },
    {
      agentId: 'agent_002',
      userId: 'user_002',
      name: '分销达人B',
      phone: '13800138002',
      status: 1,
      level: 1,
      parentId: '',
      totalCommission: 560.00,
      availableCommission: 360.00,
      frozenCommission: 100,
      withdrawnCommission: 100,
      teamCount: 8,
      orderCount: 22,
      applyTime: '2024-02-15',
      auditTime: '2024-02-16'
    },
    {
      agentId: 'agent_003',
      userId: 'user_003',
      name: '分销新人C',
      phone: '13800138003',
      status: 1,
      level: 2,
      parentId: 'agent_001',
      totalCommission: 120.00,
      availableCommission: 80.00,
      frozenCommission: 20,
      withdrawnCommission: 20,
      teamCount: 3,
      orderCount: 8,
      applyTime: '2024-03-20',
      auditTime: '2024-03-21'
    }
  ],
  // 佣金记录
  commissionRecords: [
    {
      id: 'comm_001',
      agentId: 'agent_001',
      orderId: 'ORD20240115001',
      orderAmount: 299,
      commission: 29.90,
      level: 1,
      status: 1, // 0待结算 1已结算 2已冻结
      createTime: '2024-01-15 10:30:00',
      settleTime: '2024-01-22 10:30:00'
    },
    {
      id: 'comm_002',
      agentId: 'agent_001',
      orderId: 'ORD20240201002',
      orderAmount: 599,
      commission: 59.90,
      level: 1,
      status: 1,
      createTime: '2024-02-01 14:20:00',
      settleTime: '2024-02-08 14:20:00'
    },
    {
      id: 'comm_003',
      agentId: 'agent_001',
      orderId: 'ORD20240215003',
      orderAmount: 199,
      commission: 9.95,
      level: 2,
      status: 1,
      createTime: '2024-02-15 09:15:00',
      settleTime: '2024-02-22 09:15:00'
    }
  ],
  // 提现记录
  withdrawRecords: [
    {
      id: 'withdraw_001',
      agentId: 'agent_001',
      amount: 200,
      status: 1, // 0处理中 1已到账 2已拒绝
      bankName: '工商银行',
      bankCard: '6222 **** **** 1234',
      applyTime: '2024-02-20 16:00:00',
      completeTime: '2024-02-21 10:00:00'
    },
    {
      id: 'withdraw_002',
      agentId: 'agent_001',
      amount: 200,
      status: 1,
      bankName: '支付宝',
      bankCard: '138****8001',
      applyTime: '2024-03-10 12:00:00',
      completeTime: '2024-03-11 09:00:00'
    }
  ],
  // 推广商品（可分销的商品）
  promoteGoods: [
    { goodsId: 1001, commissionRate: 0.1, status: 1 },
    { goodsId: 1002, commissionRate: 0.12, status: 1 },
    { goodsId: 1003, commissionRate: 0.08, status: 1 },
    { goodsId: 1004, commissionRate: 0.15, status: 1 },
    { goodsId: 1005, commissionRate: 0.1, status: 1 },
    { goodsId: 1006, commissionRate: 0.1, status: 1 },
    { goodsId: 1007, commissionRate: 0.08, status: 1 },
    { goodsId: 1008, commissionRate: 0.12, status: 1 }
  ],
  // 用户申请记录
  applyRecords: []
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

// 读取分销数据：storage 缺失或字段不全时用 DEFAULT 补齐。
// 注意必须深拷贝，否则调用方对返回值的修改会污染模块级 DEFAULT（写回 storage 后跨用例串数据）
function getDistData() {
  const stored = wx.getStorageSync(DIST_KEY)
  if (!stored) return clone(DEFAULT)
  return Object.assign(clone(DEFAULT), stored)
}

function saveDistData(data) {
  wx.setStorageSync(DIST_KEY, data)
}

// 首次启动预置分销数据
function ensureSeed() {
  if (wx.getStorageSync(DIST_KEY)) return
  saveDistData(clone(DEFAULT))
}

// 获取分销配置
function getConfig() {
  return getDistData().config
}

// 获取分销员列表
function getAgents(status = null) {
  const data = getDistData()
  if (status !== null) {
    return data.agents.filter(a => a.status === status)
  }
  return data.agents
}

// 获取分销员详情
function getAgentById(agentId) {
  return getDistData().agents.find(a => a.agentId === agentId) || null
}

// 获取用户的分销员信息
function getAgentByUserId(userId) {
  return getDistData().agents.find(a => a.userId === userId) || null
}

// 检查用户是否是分销员
function isAgent(userId) {
  return getDistData().agents.some(a => a.userId === userId && a.status === 1)
}

// 申请成为分销员（同一用户申请中不可重复提交；被拒绝后可重新申请）
function applyAgent(userId, name, phone) {
  if (!userId) {
    return { ok: false, msg: '请先登录后再申请' }
  }
  const data = getDistData()
  // 已是正式分销员则无需再申请
  const existing = data.agents.find(a => a.userId === userId)
  if (existing && existing.status === 1) {
    return { ok: false, msg: '您已经是分销员' }
  }
  // 审核中的申请不允许重复提交
  if (data.applyRecords.some(r => r.userId === userId && r.status === 0)) {
    return { ok: false, msg: '申请审核中，请勿重复提交' }
  }

  const applyRecord = {
    id: 'apply_' + Date.now(),
    userId,
    name,
    phone,
    status: 0, // 待审核
    createTime: new Date().toISOString()
  }
  data.applyRecords.push(applyRecord)
  saveDistData(data)
  return { ok: true, msg: '申请已提交，等待审核', apply: applyRecord }
}

// 审核分销员申请
// id 可以是已存在的 agentId，也可以是 applyRecords 里的申请 id
// status: 1 通过 / 2 拒绝；通过申请时会把申请记录转成正式分销员
function auditAgent(id, status, parentId = '') {
  const data = getDistData()
  const agent = data.agents.find(a => a.agentId === id)
  if (agent) {
    agent.status = status
    agent.auditTime = new Date().toISOString()
    if (parentId) {
      agent.parentId = parentId
      agent.level = 2
    }
    saveDistData(data)
    return { ok: true, msg: status === 1 ? '审核通过' : '已拒绝', agent }
  }

  // 申请记录审核：通过则落成正式分销员，闭环「申请 → 审核 → 分销中心」
  const apply = data.applyRecords.find(r => r.id === id)
  if (!apply) {
    return { ok: false, msg: '申请记录不存在' }
  }
  if (apply.status === 1) {
    return { ok: false, msg: '该申请已通过' }
  }

  apply.status = status
  apply.auditTime = new Date().toISOString()

  if (status !== 1) {
    saveDistData(data)
    return { ok: true, msg: '已拒绝该申请', apply }
  }

  const newAgent = {
    agentId: 'agent_' + Date.now(),
    userId: apply.userId,
    name: apply.name,
    phone: apply.phone,
    status: 1,
    level: parentId ? 2 : 1,
    parentId: parentId || '',
    totalCommission: 0,
    availableCommission: 0,
    frozenCommission: 0,
    withdrawnCommission: 0,
    teamCount: 0,
    orderCount: 0,
    applyTime: apply.createTime,
    auditTime: new Date().toISOString()
  }
  data.agents.push(newAgent)
  saveDistData(data)
  return { ok: true, msg: '审核通过，已开通分销中心', agent: newAgent, apply }
}

// 按用户 id 取申请记录（最新的在前）
function getApplyRecordsByUserId(userId) {
  const data = getDistData()
  return data.applyRecords
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
}

// 分销中心统一入口：一次拿到「我是不是分销员 / 申请状态 / 佣金统计」
// status: 'agent' 已是分销员 | 'pending' 申请待审核 | 'rejected' 申请被拒 | 'none' 从未申请
function getMyDistribution(userId) {
  if (!userId) return { status: 'none', agent: null, apply: null, stats: null }
  const agent = getAgentByUserId(userId)
  if (agent && agent.status === 1) {
    return {
      status: 'agent',
      agent,
      apply: null,
      stats: getCommissionStats(agent.agentId)
    }
  }
  const apply = getApplyRecordsByUserId(userId)[0] || null
  if (apply && apply.status === 0) return { status: 'pending', agent: null, apply, stats: null }
  if (apply && apply.status === 2) return { status: 'rejected', agent: null, apply, stats: null }
  return { status: 'none', agent: null, apply: null, stats: null }
}

// 计算佣金
function calculateCommission(orderAmount, level = 1) {
  const config = getConfig()
  const rate = level === 1 ? config.commissionRate : config.secondLevelRate
  return Math.floor(orderAmount * rate * 100) / 100
}

// 获取推广商品佣金比例
function getGoodsCommissionRate(goodsId) {
  const data = getDistData()
  const goods = data.promoteGoods.find(g => g.goodsId === goodsId)
  return goods ? goods.commissionRate : getConfig().commissionRate
}

// 检查商品是否可分销
function isGoodsPromotable(goodsId) {
  const data = getDistData()
  return data.promoteGoods.some(g => g.goodsId === goodsId && g.status === 1)
}

// 添加佣金记录
// opts.rate     直接指定佣金比例（按商品逐项计算后汇总时用）
// opts.goodsId  指定商品，取其推广佣金比例
// 不传 opts 时退回按 level 取全局比例（兼容旧调用）
function addCommissionRecord(agentId, orderId, orderAmount, level = 1, opts = {}) {
  const data = getDistData()
  const config = data.config
  let rate
  if (typeof opts.rate === 'number') {
    rate = opts.rate
  } else if (opts.goodsId) {
    rate = getGoodsCommissionRate(opts.goodsId)
  } else {
    rate = level === 1 ? config.commissionRate : config.secondLevelRate
  }
  const commission = Math.floor(orderAmount * rate * 100) / 100

  const record = {
    id: 'comm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    agentId,
    orderId,
    orderAmount,
    commission,
    rate,
    goodsId: opts.goodsId || 0,
    level,
    status: typeof opts.status === 'number' ? opts.status : 1, // 默认直接结算（简化逻辑）
    createTime: new Date().toISOString(),
    settleTime: new Date().toISOString()
  }

  data.commissionRecords.push(record)

  // 更新分销员佣金
  const agent = data.agents.find(a => a.agentId === agentId)
  if (agent) {
    agent.totalCommission = Math.round((agent.totalCommission + commission) * 100) / 100
    agent.availableCommission = Math.round((agent.availableCommission + commission) * 100) / 100
    agent.orderCount += 1
  }

  saveDistData(data)
  return record
}

// 按订单商品逐项计算佣金（只计可分销商品，各商品可按自己的推广比例）
function calcOrderCommission(order) {
  if (!order || !Array.isArray(order.items)) return 0
  let total = 0
  order.items.forEach(it => {
    if (!isGoodsPromotable(it.id)) return
    const rate = getGoodsCommissionRate(it.id)
    total += (it.price || 0) * (it.count || 0) * rate
  })
  return Math.floor(total * 100) / 100
}

// 订单支付成功后结算佣金（幂等：同一分销员 + 同一订单只结算一次）
function settleOrderCommission(order, agentId, level = 1) {
  if (!order) return { ok: false, msg: '订单不存在' }
  if (!agentId) return { ok: false, msg: '缺少分销员' }
  const agent = getAgentById(agentId)
  if (!agent) return { ok: false, msg: '分销员不存在' }
  if (agent.status !== 1) return { ok: false, msg: '分销员未通过审核' }

  const data = getDistData()
  if (data.commissionRecords.some(r => r.orderId === order.orderNo && r.agentId === agentId)) {
    return { ok: false, msg: '该订单佣金已结算' }
  }

  const commission = calcOrderCommission(order)
  if (commission <= 0) return { ok: false, msg: '该订单无可结算佣金' }

  const orderAmount = order.items.reduce((s, it) => s + (it.price || 0) * (it.count || 0), 0)
  const record = addCommissionRecord(agentId, order.orderNo, orderAmount, level, {
    rate: orderAmount > 0 ? commission / orderAmount : 0
  })
  return { ok: true, commission, record, msg: '佣金已入账' }
}

// 获取佣金记录
function getCommissionRecords(agentId) {
  return getDistData().commissionRecords.filter(r => r.agentId === agentId)
}

// 获取佣金统计
function getCommissionStats(agentId) {
  const records = getCommissionRecords(agentId)
  const total = records.reduce((sum, r) => sum + r.commission, 0)
  const settled = records.filter(r => r.status === 1).reduce((sum, r) => sum + r.commission, 0)
  const pending = records.filter(r => r.status === 0).reduce((sum, r) => sum + r.commission, 0)
  return { total, settled, pending, count: records.length }
}

// 申请提现
function applyWithdraw(agentId, amount, bankName, bankCard) {
  const data = getDistData()
  const agent = data.agents.find(a => a.agentId === agentId)
  if (!agent) {
    return { ok: false, msg: '分销员不存在' }
  }
  if (amount < data.config.minWithdraw) {
    return { ok: false, msg: '最低提现金额' + data.config.minWithdraw + '元' }
  }
  if (amount > agent.availableCommission) {
    return { ok: false, msg: '可提现余额不足' }
  }
  
  const record = {
    id: 'withdraw_' + Date.now(),
    agentId,
    amount,
    status: 0, // 处理中
    bankName,
    bankCard,
    applyTime: new Date().toISOString(),
    completeTime: ''
  }
  
  data.withdrawRecords.push(record)
  agent.availableCommission -= amount
  agent.frozenCommission += amount
  
  saveDistData(data)
  return { ok: true, msg: '提现申请已提交' }
}

// 获取提现记录
function getWithdrawRecords(agentId) {
  return getDistData().withdrawRecords.filter(r => r.agentId === agentId)
}

// 按 id 取单条提现记录
function getWithdrawById(recordId) {
  return getDistData().withdrawRecords.find(r => r.id === recordId) || null
}

// 审核提现（demo 打款动作）：status 1 已到账 / 2 已拒绝
// 已到账：冻结金额扣减 → 累计提现增加
// 已拒绝：冻结金额退回可提现余额
function auditWithdraw(recordId, status) {
  const data = getDistData()
  const record = data.withdrawRecords.find(r => r.id === recordId)
  if (!record) return { ok: false, msg: '提现记录不存在' }
  if (record.status !== 0) return { ok: false, msg: '该提现已处理' }
  if (status !== 1 && status !== 2) return { ok: false, msg: '非法状态' }

  record.status = status
  record.completeTime = new Date().toISOString()

  const agent = data.agents.find(a => a.agentId === record.agentId)
  if (agent) {
    agent.frozenCommission = Math.max(0, Math.round((agent.frozenCommission - record.amount) * 100) / 100)
    if (status === 1) {
      agent.withdrawnCommission = Math.round((agent.withdrawnCommission + record.amount) * 100) / 100
    } else {
      agent.availableCommission = Math.round((agent.availableCommission + record.amount) * 100) / 100
    }
  }

  saveDistData(data)
  return { ok: true, msg: status === 1 ? '提现已到账' : '提现被拒绝，金额已退回', record }
}

// 获取下级分销员
function getSubAgents(agentId) {
  return getDistData().agents.filter(a => a.parentId === agentId)
}

// 生成分享链接（含分销员ID）
function getShareLink(goodsId, agentId) {
  return `/pages/detail/detail?id=${goodsId}&agentId=${agentId}`
}

// ---------- 推广位（pending agent） ----------
// 用户从分销员的分享链接进入小程序时，链接上的 agentId 需要一路带到下单：
// 首页/详情页 onLoad 存下，结算页创建订单时取出写入订单，支付成功后据此结算佣金。
const PENDING_AGENT_KEY = 'distributionPendingAgent'

// 记录推广位（只接受已通过审核的分销员，避免无效 id 一路带到订单）
function setPendingAgent(agentId) {
  if (!agentId) return false
  const agent = getAgentById(agentId)
  if (!agent || agent.status !== 1) return false
  wx.setStorageSync(PENDING_AGENT_KEY, agentId)
  return true
}

function getPendingAgent() {
  return wx.getStorageSync(PENDING_AGENT_KEY) || ''
}

function clearPendingAgent() {
  wx.removeStorageSync(PENDING_AGENT_KEY)
}

// 生成分销海报数据
function getAgentPosterData(agentId, mockModule) {
  const agent = getAgentById(agentId)
  if (!agent) return null
  
  const config = getConfig()
  const stats = getCommissionStats(agentId)
  const subAgents = getSubAgents(agentId)
  
  return {
    agent,
    config,
    stats,
    teamCount: agent.teamCount,
    orderCount: agent.orderCount,
    subAgentsCount: subAgents.length
  }
}

module.exports = {
  getDistData,
  saveDistData,
  ensureSeed,
  getConfig,
  getAgents,
  getAgentById,
  getAgentByUserId,
  isAgent,
  applyAgent,
  auditAgent,
  getApplyRecordsByUserId,
  getMyDistribution,
  calculateCommission,
  getGoodsCommissionRate,
  isGoodsPromotable,
  addCommissionRecord,
  calcOrderCommission,
  settleOrderCommission,
  getCommissionRecords,
  getCommissionStats,
  applyWithdraw,
  auditWithdraw,
  getWithdrawRecords,
  getWithdrawById,
  getSubAgents,
  getShareLink,
  setPendingAgent,
  getPendingAgent,
  clearPendingAgent,
  getAgentPosterData
}
