/**
 * 拼团功能（本地存储，单对象 groupBuyData）
 *
 * 功能：拼团商品、发起拼团、参与拼团、拼团状态、倒计时
 */
const GROUP_BUY_KEY = 'groupBuyData'

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
  return Object.assign({}, DEFAULT, wx.getStorageSync(GROUP_BUY_KEY) || {})
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

module.exports = {
  getGroupBuyData,
  saveGroupBuyData,
  ensureSeed,
  getGroupGoodsConfig,
  getGroupGoods,
  getActiveGroups,
  getMyGroups,
  getGroupById,
  isGroupExpired,
  getGroupRemainTime,
  formatRemainTime,
  createGroup,
  joinGroup,
  getUserGroupCount,
  canCreateGroup,
  getJoinableGroups,
  GROUP_GOODS
}
