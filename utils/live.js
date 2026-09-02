/**
 * 直播功能（本地存储，单对象 liveData）
 *
 * 功能：直播预告、直播中、直播回放、直播间商品
 */
const LIVE_KEY = 'liveData'

const DEFAULT = {
  liveRooms: [
    {
      roomId: 1001,
      title: '星野X10新品首发直播',
      cover: 'https://picsum.photos/400/300?random=100',
      status: 1, // 0预告 1直播中 2已结束
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: '',
      anchorName: '官方主播',
      anchorAvatar: '',
      goodsIds: [1001, 1002, 1003],
      viewerCount: 1256,
      likeCount: 8934
    },
    {
      roomId: 1002,
      title: '服饰焕新季特卖专场',
      cover: 'https://picsum.photos/400/300?random=101',
      status: 0,
      startTime: new Date(Date.now() + 7200000).toISOString(),
      endTime: '',
      anchorName: '时尚主播',
      anchorAvatar: '',
      goodsIds: [1004, 1005, 1006],
      viewerCount: 0,
      likeCount: 0
    },
    {
      roomId: 1003,
      title: '家电爆款限时抢',
      cover: 'https://picsum.photos/400/300?random=102',
      status: 2,
      startTime: new Date(Date.now() - 86400000).toISOString(),
      endTime: new Date(Date.now() - 82800000).toISOString(),
      anchorName: '家电达人',
      anchorAvatar: '',
      goodsIds: [1007, 1008],
      viewerCount: 5680,
      likeCount: 23456
    }
  ]
}

function getLiveData() {
  return Object.assign({}, DEFAULT, wx.getStorageSync(LIVE_KEY) || {})
}

function saveLiveData(data) {
  wx.setStorageSync(LIVE_KEY, data)
}

// 首次启动预置直播数据
function ensureSeed() {
  if (wx.getStorageSync(LIVE_KEY)) return
  saveLiveData(DEFAULT)
}

// 获取直播列表
function getLiveRooms(status = null) {
  const data = getLiveData()
  if (status !== null) {
    return data.liveRooms.filter(r => r.status === status)
  }
  return data.liveRooms
}

// 获取直播详情
function getLiveRoomById(roomId) {
  const data = getLiveData()
  return data.liveRooms.find(r => r.roomId === roomId) || null
}

// 获取直播间商品
function getLiveGoods(roomId, mockModule) {
  const room = getLiveRoomById(roomId)
  if (!room) return []
  return room.goodsIds.map(id => mockModule.getGoodsById(id)).filter(Boolean)
}

// 更新观看人数
function updateViewerCount(roomId, count) {
  const data = getLiveData()
  const room = data.liveRooms.find(r => r.roomId === roomId)
  if (room) {
    room.viewerCount = count
    saveLiveData(data)
  }
}

// 更新点赞数
function updateLikeCount(roomId, count) {
  const data = getLiveData()
  const room = data.liveRooms.find(r => r.roomId === roomId)
  if (room) {
    room.likeCount = count
    saveLiveData(data)
  }
}

// 检查是否直播中
function isLiveRoomLive(roomId) {
  const room = getLiveRoomById(roomId)
  return room !== null && room.status === 1
}

// 获取直播状态文本
function getLiveStatusText(status) {
  const map = { 0: '即将开始', 1: '直播中', 2: '已结束' }
  return map[status] || '未知'
}

// 获取直播状态样式类
function getLiveStatusClass(status) {
  const map = { 0: 'upcoming', 1: 'living', 2: 'ended' }
  return map[status] || ''
}

// 格式化数字（如观看人数）
function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

// 计算直播时长
function getLiveDuration(startTime, endTime) {
  const start = new Date(startTime).getTime()
  const end = endTime ? new Date(endTime).getTime() : Date.now()
  const duration = end - start
  const hours = Math.floor(duration / 3600000)
  const minutes = Math.floor((duration % 3600000) / 60000)
  if (hours > 0) {
    return hours + '小时' + minutes + '分钟'
  }
  return minutes + '分钟'
}

module.exports = {
  getLiveData,
  saveLiveData,
  ensureSeed,
  getLiveRooms,
  getLiveRoomById,
  getLiveGoods,
  updateViewerCount,
  updateLikeCount,
  isLiveRoomLive,
  getLiveStatusText,
  getLiveStatusClass,
  formatNumber,
  getLiveDuration
}
