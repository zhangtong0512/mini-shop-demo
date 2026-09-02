const store = require('../../utils/store')

Page({
  data: {
    store: null,
    currentStore: null,
    isCurrentStore: false
  },

  onLoad(options) {
    const id = Number(options.id)
    this.loadData(id)
  },

  loadData(id) {
    const storeInfo = store.getStoreById(id)
    const currentStore = store.getCurrentStore()
    const isCurrentStore = currentStore && currentStore.id === id
    this.setData({ store: storeInfo, currentStore, isCurrentStore })
    if (storeInfo) {
      wx.setNavigationBarTitle({ title: storeInfo.name })
    }
  },

  onSelectStore() {
    const { store } = this.data
    store.setCurrentStore(store)
    this.setData({ isCurrentStore: true })
    wx.showToast({ title: '已选择门店', icon: 'success' })
    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  },

  onCallTap() {
    const { store } = this.data
    wx.makePhoneCall({ phoneNumber: store.phone })
  },

  onNavigateTap() {
    const { store } = this.data
    wx.openLocation({
      latitude: store.location.latitude,
      longitude: store.location.longitude,
      name: store.name,
      address: store.address,
      scale: 15
    })
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    const { store } = this.data
    wx.previewImage({
      current: url,
      urls: store.images
    })
  }
})
