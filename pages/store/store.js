const store = require('../../utils/store')

Page({
  data: {
    stores: [],
    userLocation: null,
    loading: false,
    keyword: ''
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      await store.getUserCurrentLocation()
    } catch (e) {
      console.log('获取位置失败', e)
    }
    const stores = store.getSortedStores()
    const userLocation = store.getUserLocation()
    this.setData({ stores, userLocation, loading: false })
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
      this.setData({ stores: store.getSortedStores() })
      return
    }
    const results = store.searchStores(keyword)
    const userLocation = store.getUserLocation()
    this.setData({ stores: store.sortByDistance(results, userLocation) })
  },

  onClearSearch() {
    this.setData({ keyword: '', stores: store.getSortedStores() })
  },

  onStoreTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/store-detail/store-detail?id=' + id })
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
