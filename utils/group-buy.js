/**
 * 拼团功能（本地存储，单对象 groupBuyData）
 *
 * 功能：拼团商品、发起拼团、参与拼团、拼团状态、倒计时
 */
const GROUP_BUY_KEY = 'groupBuyData'

const notification = require('./notification')

// 拼团商品配置
const GROUP_GOODS = [
  { goodsId: 1001, groupPrice: 3299, originalPrice: 3999, groupSize: 2, limitPerUser: 1 },
  { goodsId: 1002, groupPrice: 1599, originalPrice: 1999, groupSize: 2, limitPerUser: 2 },
  { goodsId: 1003, groupPrice: 2399, originalPrice: 2999, groupSize: 3, limitPerUser: 1 },
  { goodsId: 1009, groupPrice: 189, originalPrice: 249, groupSize: 2, limitPerUser: 3 }
]

const DEFAULT = {
  groups: [],
  myGroups: []
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function nowStr() {
  const d = new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

function generateGroupNo() {
  const d = new Date()
  return 'G' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
    pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())
}

function getGroupBuyData() {
  const stored = wx.getStorageSync(GROUP_BUY_KEY)
  if (!stored) return JSON.parse(JSON.stringify(DEFAULT))
  return Object.assign(JSON.parse(JSON.stringify(DEFAULT)), stored)
}

function saveGroupBuyData(data) {
  wx.setStorageSync(GROUP_BUY_KEY, data)
}

// 首次启动预置拼团数据
function ensureSeed() {
  if (wx.getStorageSync(GROUP_BUY_KEY)) return
  
  // 预置一个进行中的拼团
  const now = Date.now()
  const data = {
    groups: [
      {
        id: generateGroupNo(),
        goodsId: 1001,
        groupPrice: 3299,
        originalPrice: 3999,
        status: 0, // 0拼团中 1已成功 2已失败
        ownerId: 'user_demo',
        ownerNickname: '张三',
        ownerAvatar: '',
        members: [
          { userId: 'user_demo', nickname: '张三', avatar: '', joinTime: nowStr() }
        ],
        requiredCount: 2,
        currentCount: 1,
        createTime: nowStr(),
        expireTime: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        orderNo: ''
      }
    ],
    myGroups: []
  }
  saveGroupBuyData(data)
}

// 获取拼团商品配置
function getGroupGoodsConfig() {
  return GROUP_GOODS
}

// 获取拼团商品信息（结合商品数据）
function getGroupGoods(mockModule) {
  const config = getGroupGoodsConfig()
  return config.map(c => {
    const goods = mockModule.getGoodsById(c.goodsId)
    if (!goods) return null
    return {
      ...goods,
      groupPrice: c.groupPrice,
      originalPrice: c.originalPrice,
      groupSize: c.groupSize,
      limitPerUser: c.limitPerUser,
      groupCount: getGoodsGroupCount(c.goodsId)
    }
  }).filter(Boolean)
}

// 获取商品的拼团中数量
function getGoodsGroupCount(goodsId) {
  const data = getGroupBuyData()
  return data.groups.filter(g => g.goodsId === goodsId && g.status === 0).length
}

// 获取拼团列表（进行中的）
function getActiveGroups() {
  const data = getGroupBuyData()
  return data.groups.filter(g => g.status === 0)
}

// 获取我的拼团
function getMyGroups() {
  const data = getGroupBuyData()
  return data.myGroups || []
}

// 获取拼团详情
function getGroupById(groupId) {
  const data = getGroupBuyData()
  return data.groups.find(g => g.id === groupId) || null
}

// 检查拼团是否过期
function isGroupExpired(group) {
  if (!group || group.status !== 0) return false
  return new Date(group.expireTime) < new Date()
}

// 获取拼团剩余时间（毫秒）
function getGroupRemainTime(group) {
  if (!group || group.status !== 0) return 0
  const expire = new Date(group.expireTime).getTime()
  const now = Date.now()
  return Math.max(0, expire - now)
}

// 格式化剩余时间
function formatRemainTime(ms) {
  if (ms <= 0) return '已结束'
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)
  return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds)
}

// 发起拼团
function createGroup(goodsId, userId, userNickname, userAvatar) {
  const config = GROUP_GOODS.find(c => c.goodsId === goodsId)
  if (!config) return { ok: false, msg: '商品不支持拼团' }
  
  const data = getGroupBuyData()
  const groupNo = generateGroupNo()
  const expireTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  
  const newGroup = {
    id: groupNo,
    goodsId,
    groupPrice: config.groupPrice,
    originalPrice: config.originalPrice,
    status: 0,
    ownerId: userId,
    ownerNickname: userNickname,
    ownerAvatar: userAvatar,
    members: [
      { userId, nickname: userNickname, avatar: userAvatar, joinTime: nowStr() }
    ],
    requiredCount: config.groupSize,
    currentCount: 1,
    createTime: nowStr(),
    expireTime,
    orderNo: ''
  }
  
  data.groups.unshift(newGroup)
  data.myGroups.unshift({ groupId: groupNo, goodsId, joinTime: nowStr() })
  saveGroupBuyData(data)
  
  return { ok: true, group: newGroup }
}

// 参与拼团
function joinGroup(groupId, userId, userNickname, userAvatar) {
  const data = getGroupBuyData()
  const group = data.groups.find(g => g.id === groupId)
  
  if (!group) return { ok: false, msg: '拼团不存在' }
  if (group.status !== 0) return { ok: false, msg: '拼团已结束' }
  if (isGroupExpired(group)) {
    group.status = 2
    saveGroupBuyData(data)
    return { ok: false, msg: '拼团已过期' }
  }
  if (group.currentCount >= group.requiredCount) return { ok: false, msg: '拼团已满' }
  if (group.members.some(m => m.userId === userId)) return { ok: false, msg: '您已参与该拼团' }
  
  group.members.push({ userId, nickname: userNickname, avatar: userAvatar, joinTime: nowStr() })
  group.currentCount++
  
  // 检查是否成团
  if (group.currentCount >= group.requiredCount) {
    group.status = 1
  }
  
  data.myGroups.unshift({ groupId, goodsId: group.goodsId, joinTime: nowStr() })
  saveGroupBuyData(data)
  
  // 成团即发通知，让「消息中心」能反映拼团结果
  if (group.status === 1) notifyGroupSuccess(group)
  
  return { ok: true, group, success: group.status === 1 }
}

// 检查用户在某个商品的拼团次数
function getUserGroupCount(goodsId, userId) {
  const data = getGroupBuyData()
  return data.groups.filter(g => 
    g.goodsId === goodsId && 
    g.members.some(m => m.userId === userId)
  ).length
}

// 检查用户是否可以发起新拼团
function canCreateGroup(goodsId, userId) {
  const config = GROUP_GOODS.find(c => c.goodsId === goodsId)
  if (!config) return false
  const count = getUserGroupCount(goodsId, userId)
  return count < config.limitPerUser
}

// 获取可参与的拼团（他人发起的）
function getJoinableGroups(goodsId, userId) {
  const data = getGroupBuyData()
  return data.groups.filter(g => 
    g.goodsId === goodsId && 
    g.status === 0 && 
    !isGroupExpired(g) &&
    g.currentCount < g.requiredCount &&
    !g.members.some(m => m.userId === userId)
  )
}

// ---------- 与订单打通 ----------
// 拼团订单在 mock.createOrder 时带上 groupBuyId，支付成功后由拼团页调用本模块把订单号回写，
// 使「我的拼团」能直接跳到订单详情，也让成团通知能带上订单号。

// 把订单号挂到拼团上（幂等）
function attachOrder(groupId, orderNo) {
  const data = getGroupBuyData()
  const group = data.groups.find(g => g.id === groupId)
  if (!group) return { ok: false, msg: '拼团不存在' }
  group.orderNo = orderNo
  data.myGroups = (data.myGroups || []).map(m =>
    m.groupId === groupId ? Object.assign({}, m, { orderNo }) : m
  )
  saveGroupBuyData(data)
  return { ok: true, group }
}

// 按订单号找拼团（订单详情展示拼团进度用）
function getGroupByOrderNo(orderNo) {
  if (!orderNo) return null
  return getGroupBuyData().groups.find(g => g.orderNo === orderNo) || null
}

// 我的拼团（含拼团详情与商品，供「我的拼团」列表直接渲染）
function getMyGroupsDetail(mockModule) {
  const data = getGroupBuyData()
  return (data.myGroups || []).map(m => {
    const group = data.groups.find(g => g.id === m.groupId)
    const goods = mockModule ? mockModule.getGoodsById(m.goodsId) : null
    return {
      groupId: m.groupId,
      goodsId: m.goodsId,
      joinTime: m.joinTime,
      orderNo: (group && group.orderNo) || m.orderNo || '',
      status: group ? group.status : 2,
      statusText: group ? (group.status === 0 ? '拼团中' : group.status === 1 ? '拼团成功' : '拼团失败') : '拼团失败',
      currentCount: group ? group.currentCount : 0,
      requiredCount: group ? group.requiredCount : 0,
      groupPrice: group ? group.groupPrice : 0,
      expireTime: group ? group.expireTime : '',
      goodsTitle: goods ? goods.title : '',
      goodsImage: goods ? goods.galleryImages[0] : '',
      goodsEmoji: goods ? goods.emoji : '📦'
    }
  }).sort((a, b) => new Date(b.joinTime) - new Date(a.joinTime))
}

// 检查拼团状态：过期未成团 → 置为失败并通知（在列表/详情加载时调用）
// 返回本次由拼团中变为失败的拼团数组
function checkGroupStatus(groupId) {
  const data = getGroupBuyData()
  const groups = groupId ? data.groups.filter(g => g.id === groupId) : data.groups
  const failed = []
  groups.forEach(g => {
    if (g.status === 0 && isGroupExpired(g)) {
      g.status = 2
      failed.push(g)
    }
  })
  if (failed.length) saveGroupBuyData(data)
  failed.forEach(g => {
    notification.addGroupNotification(
      '拼团失败',
      '很遗憾，「' + (g.goodsId ? '拼团商品' : '商品') + '」拼团未在有效期内成团，订单将按原路退款',
      { groupId: g.id }
    )
  })
  return failed
}

// 成团通知（joinGroup 判定成团后调用）
function notifyGroupSuccess(group) {
  return notification.addGroupNotification(
    '拼团成功',
    '恭喜！您参与的拼团已凑满 ' + group.requiredCount + ' 人，商家将尽快发货',
    { groupId: group.id }
  )
}

module.exports = {
  getGroupBuyData,
  saveGroupBuyData,
  ensureSeed,
  getGroupGoodsConfig,
  getGroupGoods,
  getActiveGroups,
  getMyGroups,
  getMyGroupsDetail,
  getGroupById,
  getGroupByOrderNo,
  isGroupExpired,
  getGroupRemainTime,
  formatRemainTime,
  createGroup,
  joinGroup,
  attachOrder,
  checkGroupStatus,
  notifyGroupSuccess,
  getUserGroupCount,
  canCreateGroup,
  getJoinableGroups,
  GROUP_GOODS
}
