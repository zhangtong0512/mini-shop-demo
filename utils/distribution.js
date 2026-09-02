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

function getDistData() {
  return Object.assign({}, DEFAULT, wx.getStorageSync(DIST_KEY) || {})
}

function saveDistData(data) {
  wx.setStorageSync(DIST_KEY, data)
}

// 首次启动预置分销数据
function ensureSeed() {
  if (wx.getStorageSync(DIST_KEY)) return
  saveDistData(DEFAULT)
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

// 申请成为分销员
function applyAgent(userId, name, phone) {
  const data = getDistData()
  // 检查是否已申请
  const existing = data.agents.find(a => a.userId === userId)
  if (existing) {
    return { ok: false, msg: '您已提交过申请' }
  }
  // 检查申请记录
  const applied = data.applyRecords.some(r => r.userId === userId)
  if (applied) {
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
  return { ok: true, msg: '申请已提交，等待审核' }
}

// 审核分销员申请
function auditAgent(agentId, status, parentId = '') {
  const data = getDistData()
  const agent = data.agents.find(a => a.agentId === agentId)
  if (!agent) {
    return { ok: false, msg: '分销员不存在' }
  }
  agent.status = status
  agent.auditTime = new Date().toISOString()
  if (parentId) {
    agent.parentId = parentId
    agent.level = 2
  }
  saveDistData(data)
  return { ok: true, msg: status === 1 ? '审核通过' : '已拒绝' }
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
function addCommissionRecord(agentId, orderId, orderAmount, level) {
  const data = getDistData()
  const rate = getGoodsCommissionRate(orderId.replace('ORD', '').slice(0, 4)) || getConfig().commissionRate
  const commission = Math.floor(orderAmount * rate * 100) / 100
  
  const record = {
    id: 'comm_' + Date.now(),
    agentId,
    orderId,
    orderAmount,
    commission,
    level,
    status: 1, // 直接结算（简化逻辑）
    createTime: new Date().toISOString(),
    settleTime: new Date().toISOString()
  }
  
  data.commissionRecords.push(record)
  
  // 更新分销员佣金
  const agent = data.agents.find(a => a.agentId === agentId)
  if (agent) {
    agent.totalCommission += commission
    agent.availableCommission += commission
    agent.orderCount += 1
  }
  
  saveDistData(data)
  return record
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

// 获取下级分销员
function getSubAgents(agentId) {
  return getDistData().agents.filter(a => a.parentId === agentId)
}

// 生成分享链接（含分销员ID）
function getShareLink(goodsId, agentId) {
  return `/pages/detail/detail?id=${goodsId}&agentId=${agentId}`
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
  calculateCommission,
  getGoodsCommissionRate,
  isGoodsPromotable,
  addCommissionRecord,
  getCommissionRecords,
  getCommissionStats,
  applyWithdraw,
  getWithdrawRecords,
  getSubAgents,
  getShareLink,
  getAgentPosterData
}
