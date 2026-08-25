const cart = require('../../utils/cart')

Page({
  data: {
    list: [],
    allSelected: false,
    totalPrice: 0,
    totalCount: 0
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const list = cart.getCart()
    const summary = cart.getSummary()
    this.setData({
      list,
      allSelected: list.length > 0 && list.every(item => item.selected),
      totalPrice: summary.totalPrice,
      totalCount: summary.totalCount
    })
  },

  onToggleSelect(e) {
    cart.toggleSelect(e.currentTarget.dataset.key)
    this.refresh()
  },

  onToggleAll() {
    cart.toggleSelectAll(!this.data.allSelected)
    this.refresh()
  },

  onPlus(e) {
    cart.changeCount(e.currentTarget.dataset.key, 1)
    this.refresh()
  },

  onMinus(e) {
    cart.changeCount(e.currentTarget.dataset.key, -1)
    this.refresh()
  },

  onRemove(e) {
    const key = e.currentTarget.dataset.key
    wx.showModal({
      title: '提示',
      content: '确定要删除该商品吗？',
      success: res => {
        if (res.confirm) {
          cart.removeItem(key)
          this.refresh()
        }
      }
    })
  },

  onGoDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },

  onGoShopping() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onCheckout() {
    if (this.data.totalCount <= 0) {
      wx.showToast({ title: '请先选择商品', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/checkout/checkout' })
  }
})
