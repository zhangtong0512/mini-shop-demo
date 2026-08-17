const mock = require('../../utils/mock')

Page({
  data: {
    order: null,
    amount: 0,
    orderNo: ''
  },

  onLoad(options) {
    const order = mock.getOrderById(options.id)
    this.setData({
      order,
      amount: order ? order.totalPrice : 0,
      orderNo: order ? order.orderNo : ''
    })
  },

  onViewOrder() {
    if (!this.data.order) return
    wx.redirectTo({ url: '/pages/order-detail/order-detail?id=' + this.data.order.id })
  },

  onBackHome() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
