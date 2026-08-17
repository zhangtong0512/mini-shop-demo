const cart = require('../../utils/cart')
const mock = require('../../utils/mock')

Page({
  data: {
    user: {
      nickname: 'Demo用户',
      emoji: '😀',
      id: 'ID: 202608170001'
    },
    orderCounts: [0, 0, 0, 0]
  },

  onShow() {
    // 各状态订单数量 + 购物车角标兜底
    const orders = mock.getOrders()
    this.setData({
      orderCounts: [1, 2, 3, 4].map(s => orders.filter(o => o.status === s).length)
    })
    cart.updateBadge()
  },

  onOrderTap(e) {
    const tab = e.currentTarget.dataset.tab
    wx.navigateTo({ url: '/pages/order/order?tab=' + tab })
  },

  onAddressTap() {
    wx.navigateTo({ url: '/pages/address/address' })
  },

  onMenuTap(e) {
    const name = e.currentTarget.dataset.name
    wx.showToast({ title: name + '（demo 功能）', icon: 'none' })
  }
})
