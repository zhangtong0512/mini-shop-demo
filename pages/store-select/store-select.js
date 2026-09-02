const store = require('../../utils/store')

Page({
  data: {
    stores: [],
    currentStore: null
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const stores = store.getSortedStores()
    const currentStore = store.getCurrentStore()
    this.setData({ stores, currentStore })
  },

  onSelectStore(e) {
    const id = e.currentTarget.dataset.id
    const selectedStore = this.data.stores.find(s => s.id === id)
    if (selectedStore) {
      store.setCurrentStore(selectedStore)
      this.setData({ currentStore: selectedStore })
      
      // 通过事件通道返回选择的门店
      const eventChannel = this.getOpenerEventChannel()
      if (eventChannel) {
        eventChannel.emit('selectStore', { store: selectedStore })
      }
      
      wx.showToast({ title: '已选择门店', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
    }
  },

  onStoreDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/store-detail/store-detail?id=' + id })
  }
})
