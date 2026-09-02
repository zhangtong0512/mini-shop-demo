/**
 * 多门店系统（本地存储，单对象 storeData）
 *
 * 功能：门店列表、门店详情、距离计算、门店选择
 */
const STORE_KEY = 'storeData'

const DEFAULT = {
  stores: [
    {
      id: 1,
      name: '精选商城·上海旗舰店',
      address: '上海市浦东新区世纪大道100号',
      phone: '021-58888888',
      businessHours: '09:00-22:00',
      location: { latitude: 31.2304, longitude: 121.4737 },
      images: [
        'https://picsum.photos/400/300?random=1',
        'https://picsum.photos/400/300?random=2'
      ],
      services: ['自提', '退换货', '体验'],
      status: 1,
      distance: 0
    },
    {
      id: 2,
      name: '精选商城·北京国贸店',
      address: '北京市朝阳区建国门外大街1号',
      phone: '010-65888888',
      businessHours: '09:30-21:30',
      location: { latitude: 39.9042, longitude: 116.4074 },
      images: [
        'https://picsum.photos/400/300?random=3',
        'https://picsum.photos/400/300?random=4'
      ],
      services: ['自提', '退换货'],
      status: 1,
      distance: 0
    },
    {
      id: 3,
      name: '精选商城·广州天河店',
      address: '广州市天河区天河路228号',
      phone: '020-38888888',
      businessHours: '10:00-22:00',
      location: { latitude: 23.1291, longitude: 113.2644 },
      images: [
        'https://picsum.photos/400/300?random=5',
        'https://picsum.photos/400/300?random=6'
      ],
      services: ['自提', '退换货', '体验', '维修'],
      status: 1,
      distance: 0
    },
    {
      id: 4,
      name: '精选商城·深圳南山店',
      address: '深圳市南山区深南大道9966号',
      phone: '0755-86888888',
      businessHours: '10:00-21:00',
      location: { latitude: 22.5431, longitude: 114.0579 },
      images: [
        'https://picsum.photos/400/300?random=7',
        'https://picsum.photos/400/300?random=8'
      ],
      services: ['自提', '退换货'],
      status: 1,
      distance: 0
    },
    {
      id: 5,
      name: '精选商城·成都春熙路店',
      address: '成都市锦江区春熙路99号',
      phone: '028-86668888',
      businessHours: '09:30-22:00',
      location: { latitude: 30.5728, longitude: 104.0668 },
      images: [
        'https://picsum.photos/400/300?random=9',
        'https://picsum.photos/400/300?random=10'
      ],
      services: ['自提', '退换货', '体验'],
      status: 1,
      distance: 0
    }
  ],
  currentStore: null,
  userLocation: null,
  deliveryMode: 'express' // express快递 / selfPickup自提
}

function getStoreData() {
  return Object.assign({}, DEFAULT, wx.getStorageSync(STORE_KEY) || {})
}

function saveStoreData(data) {
  wx.setStorageSync(STORE_KEY, data)
}

// 首次启动预置门店数据
function ensureSeed() {
  if (wx.getStorageSync(STORE_KEY)) return
  saveStoreData(DEFAULT)
}

// 获取门店列表
function getStores() {
  return getStoreData().stores
}

// 获取门店详情
function getStoreById(id) {
  const stores = getStores()
  return stores.find(s => s.id === id) || null
}

// 设置当前门店
function setCurrentStore(store) {
  const data = getStoreData()
  data.currentStore = store
  saveStoreData(data)
}

// 获取当前门店
function getCurrentStore() {
  return getStoreData().currentStore
}

// 清除当前门店
function clearCurrentStore() {
  const data = getStoreData()
  data.currentStore = null
  saveStoreData(data)
}

// 设置用户位置
function setUserLocation(location) {
  const data = getStoreData()
  data.userLocation = location
  saveStoreData(data)
}

// 获取用户位置
function getUserLocation() {
  return getStoreData().userLocation
}

// 设置配送方式
function setDeliveryMode(mode) {
  const data = getStoreData()
  data.deliveryMode = mode
  saveStoreData(data)
}

// 获取配送方式
function getDeliveryMode() {
  return getStoreData().deliveryMode
}

// 计算两点距离（Haversine公式，返回公里）
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371 // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 按距离排序门店
function sortByDistance(stores, userLocation) {
  if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
    return stores
  }
  return stores.map(s => ({
    ...s,
    distance: calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      s.location.latitude,
      s.location.longitude
    )
  })).sort((a, b) => a.distance - b.distance)
}

// 获取排序后的门店列表
function getSortedStores() {
  const stores = getStores()
  const userLocation = getUserLocation()
  return sortByDistance(stores, userLocation)
}

// 获取营业中的门店
function getOpenStores() {
  return getStores().filter(s => s.status === 1)
}

// 搜索门店
function searchStores(keyword) {
  const stores = getStores()
  const kw = keyword.toLowerCase()
  return stores.filter(s =>
    s.name.toLowerCase().includes(kw) ||
    s.address.toLowerCase().includes(kw)
  )
}

// 格式化距离显示
function formatDistance(distance) {
  if (!distance && distance !== 0) return '未知'
  if (distance < 1) {
    return Math.round(distance * 1000) + 'm'
  }
  return distance.toFixed(1) + 'km'
}

// 获取用户当前位置（封装wx.getLocation）
function getUserCurrentLocation() {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success: res => {
        const location = {
          latitude: res.latitude,
          longitude: res.longitude
        }
        setUserLocation(location)
        resolve(location)
      },
      fail: err => {
        reject(err)
      }
    })
  })
}

module.exports = {
  getStoreData,
  saveStoreData,
  ensureSeed,
  getStores,
  getStoreById,
  setCurrentStore,
  getCurrentStore,
  clearCurrentStore,
  setUserLocation,
  getUserLocation,
  setDeliveryMode,
  getDeliveryMode,
  calculateDistance,
  sortByDistance,
  getSortedStores,
  getOpenStores,
  searchStores,
  formatDistance,
  getUserCurrentLocation
}
