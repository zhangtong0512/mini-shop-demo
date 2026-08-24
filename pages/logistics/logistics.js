const mock = require('../../utils/mock')

Page({
  data: {
    orderNo: '',
    statusText: '',
    traces: []
  },

  onLoad(options) {
    const order = mock.getOrderById(options.id)
    if (!order) return
    this.setData({
      orderNo: order.orderNo,
      statusText: mock.statusText(order.status),
      traces: mock.getLogistics(order.id)
    })
  }
})
