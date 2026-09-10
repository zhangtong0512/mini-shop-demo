const store = require('../../utils/store')

Page({
  data: {
    stores: [],
    userLocation: null,
    loading: false,
    keyword: '',
    currentStore: null,
    locationDenied: false
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    this.setData({ loading: true })
    let locationDenied = false
    try {
      await store.getUserCurrentLocation()
    } catch (e) {
      // 用户拒绝定位授权时仍可浏览门店，只是不显示距离
      locationDenied = true
      console.log('获取位置失败', e)
    }
    const stores = this.decorate(store.getSortedStores())
    const userLocation = store.getUserLocation()
    this.setData({
      stores,
      userLocation,
      loading: false,
      locationDenied,
      currentStore: store.getCurrentStore()
    })
  },

  // 补上距离文案（sortByDistance 只返回
  // 数值型 distance，页面需要 distanceText）
  decorate(list) {
    return list.map(s => Object.assign({}, s, {
      distanceText: store.formatDistance(s.distance)
    }))
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
    this.searchStores()
  },

  onSearchConfirm() {
    this.searchStores()
  },

  searchStores() {
    const keyword = this.data.keyword.trim()
    if (!keyword) {
      this.setData({ stores: this.decorate(store.getSortedStores()) })
      return
    }
    const results = store.searchStores(keyword)
    const userLocation = store.getUserLocation()
    this.setData({ stores: this.decorate(store.sortByDistance(results, userLocation)) })
  },

  onClearSearch() {
    this.setData({ keyword: '', stores: this.decorate(store.getSortedStores()) })
  },

  onStoreTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/store-detail/store-detail?id=' + id })
  },

  // 设为自提门店：写入门店 + 配送方式，回确认订单页即按「自提免运费 + 门店分仓库存」结算
  onSetPickupTap(e) {
    const id = e.currentTarget.dataset.id
    const picked = this.data.stores.find(s => s.id === id)
    if (!picked) return
    store.setCurrentStore(picked)
    store.setDeliveryMode('selfPickup')
    this.setData({ currentStore: picked })
    wx.showToast({ title: '已设为自提门店', icon: 'success' })
  },

  // 重新定位（授权失败后手动重试）
  onRelocateTap() {
    this.loadData()
  },

  onCallTap(e) {
    const phone = e.currentTarget.dataset.phone
    wx.makePhoneCall({ phoneNumber: phone })
  },

  onNavigateTap(e) {
    const location = e.currentTarget.dataset.location
    wx.openLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      scale: 15
    })
  },

  onRefresh() {
    this.loadData()
  }
})
