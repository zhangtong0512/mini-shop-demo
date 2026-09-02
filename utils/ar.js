/**
 * AR试穿/试用功能（本地存储，单对象 arData）
 *
 * 功能：AR商品配置、摄像头预览、模型叠加、截图保存
 */
const AR_KEY = 'arData'

// AR商品配置
const AR_GOODS_CONFIG = [
  {
    goodsId: 1004,
    type: 'wear', // wear试穿 / use试用
    name: '时尚卫衣',
    modelUrl: '',
    posterUrl: 'https://picsum.photos/400/500?random=200',
    description: '虚拟试穿，看看效果',
    hotspots: [
      { x: 0.5, y: 0.3, label: '领口' },
      { x: 0.3, y: 0.5, label: '左袖' },
      { x: 0.7, y: 0.5, label: '右袖' }
    ]
  },
  {
    goodsId: 1005,
    type: 'wear',
    name: '潮流T恤',
    modelUrl: '',
    posterUrl: 'https://picsum.photos/400/500?random=201',
    description: '虚拟试穿，看看效果',
    hotspots: [
      { x: 0.5, y: 0.3, label: '领口' },
      { x: 0.5, y: 0.6, label: '胸前图案' }
    ]
  },
  {
    goodsId: 1001,
    type: 'use',
    name: '智能手机',
    modelUrl: '',
    posterUrl: 'https://picsum.photos/400/500?random=202',
    description: 'AR预览，感受真实尺寸',
    hotspots: [
      { x: 0.5, y: 0.2, label: '屏幕' },
      { x: 0.5, y: 0.8, label: '按键' }
    ]
  }
]

const DEFAULT = {
  arGoods: AR_GOODS_CONFIG,
  favorites: [],
  history: []
}

function getArData() {
  return Object.assign({}, DEFAULT, wx.getStorageSync(AR_KEY) || {})
}

function saveArData(data) {
  wx.setStorageSync(AR_KEY, data)
}

// 首次启动预置AR数据
function ensureSeed() {
  if (wx.getStorageSync(AR_KEY)) return
  saveArData(DEFAULT)
}

// 获取AR商品配置列表
function getArGoodsConfig() {
  return AR_GOODS_CONFIG
}

// 获取AR商品配置（按商品ID）
function getArConfigByGoodsId(goodsId) {
  return AR_GOODS_CONFIG.find(c => c.goodsId === goodsId) || null
}

// 检查商品是否支持AR
function isArSupported(goodsId) {
  return AR_GOODS_CONFIG.some(c => c.goodsId === goodsId)
}

// 获取AR商品详情（结合商品数据）
function getArGoodsDetail(goodsId, mockModule) {
  const config = getArConfigByGoodsId(goodsId)
  if (!config) return null
  const goods = mockModule.getGoodsById(goodsId)
  return {
    ...config,
    goods
  }
}

// 检查设备是否支持AR
function checkArCapability() {
  return new Promise((resolve) => {
    wx.getSystemInfo({
      success: (res) => {
        const platform = res.platform
        const SDKVersion = res.SDKVersion
        // 基础库 2.19.0+ 支持 AR 能力
        const versionParts = SDKVersion.split('.').map(Number)
        const isSupported = versionParts[0] > 2 || 
          (versionParts[0] === 2 && versionParts[1] >= 19)
        resolve({
          supported: isSupported,
          platform,
          SDKVersion,
          message: isSupported ? '设备支持AR' : '基础库版本过低，AR功能受限'
        })
      },
      fail: () => {
        resolve({ supported: false, message: '获取系统信息失败' })
      }
    })
  })
}

// 请求摄像头权限
function requestCameraPermission() {
  return new Promise((resolve) => {
    wx.authorize({
      scope: 'scope.camera',
      success: () => resolve({ authorized: true }),
      fail: () => resolve({ authorized: false })
    })
  })
}

// 保存截图到相册
function saveScreenshot(filePath) {
  return new Promise((resolve) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve({ saved: true }),
      fail: (err) => resolve({ saved: false, error: err })
    })
  })
}

// 添加到收藏
function addFavorite(goodsId) {
  const data = getArData()
  if (!data.favorites.includes(goodsId)) {
    data.favorites.push(goodsId)
    saveArData(data)
  }
}

// 移除收藏
function removeFavorite(goodsId) {
  const data = getArData()
  const index = data.favorites.indexOf(goodsId)
  if (index > -1) {
    data.favorites.splice(index, 1)
    saveArData(data)
  }
}

// 检查是否收藏
function isFavorite(goodsId) {
  return getArData().favorites.includes(goodsId)
}

// 添加到浏览历史
function addHistory(goodsId) {
  const data = getArData()
  // 移除已有的记录
  const index = data.history.indexOf(goodsId)
  if (index > -1) {
    data.history.splice(index, 1)
  }
  // 添加到开头
  data.history.unshift(goodsId)
  // 最多保存20条
  if (data.history.length > 20) {
    data.history = data.history.slice(0, 20)
  }
  saveArData(data)
}

// 获取浏览历史
function getHistory() {
  return getArData().history
}

// 清空浏览历史
function clearHistory() {
  const data = getArData()
  data.history = []
  saveArData(data)
}

module.exports = {
  getArData,
  saveArData,
  ensureSeed,
  getArGoodsConfig,
  getArConfigByGoodsId,
  isArSupported,
  getArGoodsDetail,
  checkArCapability,
  requestCameraPermission,
  saveScreenshot,
  addFavorite,
  removeFavorite,
  isFavorite,
  addHistory,
  getHistory,
  clearHistory,
  AR_GOODS_CONFIG
}
