const mock = require('../../utils/mock')
const cart = require('../../utils/cart')
const pay = require('../../utils/pay')

const STATUS_META = {
  1: { icon: '💰', title: '等待付款', sub: '订单提交成功，请尽快完成支付' },
  2: { icon: '📦', title: '卖家发货中', sub: '付款成功，等待卖家发货' },
  3: { icon: '🚚', title: '已发货', sub: '商品正在路上，请注意查收' },
  4: { icon: '✅', title: '交易完成', sub: '感谢您的购买，期待再次光临' },
  5: { icon: '⏹️', title: '订单已取消', sub: '很遗憾，该订单已取消' }
}

Page({
  data: {
    order: null,
    statusIcon: '',
    statusTitle: '',
    statusSub: '',
    remainText: ''
  },

  onLoad(options) {
    this.id = Number(options.id)
    this.refresh()
  },

  onShow() {
    this.refresh()
  },

  onUnload() {
    this.clearTimer()
  },

  onHide() {
    this.clearTimer()
  },

  refresh() {
    mock.cancelExpiredOrders()
    const order = mock.getOrderById(this.id)
    if (!order) {
      this.clearTimer()
      this.setData({ order: null })
      wx.showToast({ title: '订单不存在', icon: 'none' })
      return
    }
    const meta = STATUS_META[order.status] || { icon: '📄', title: '订单详情', sub: '' }
    this.setData({
      order,
      statusIcon: meta.icon,
      statusTitle: meta.title,
      statusSub: meta.sub,
      remainText: mock.remainText(order)
    })
    this.syncTimer()
  },

  // 待付款订单每秒刷新倒计时
  syncTimer() {
    const order = this.data.order
    if (order && order.status === 1 && !this._timer) {
      this._timer = setInterval(() => {
        const o = mock.getOrderById(this.id)
        if (!o || o.status !== 1) {
          this.clearTimer()
          this.refresh()
          return
        }
        const remain = mock.remainText(o)
        if (!remain) {
          // 已超时，触发自动取消并刷新
          mock.cancelExpiredOrders()
          this.refresh()
          return
        }
        this.setData({ remainText: remain })
      }, 1000)
    } else if ((!order || order.status !== 1) && this._timer) {
      this.clearTimer()
    }
  },

  clearTimer() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  onPay() {
    const order = this.data.order
    if (!order) return
    pay.payOrder(order, { sheet: this.selectComponent('#paySheet') }).then(paid => {
      if (paid) {
        wx.redirectTo({ url: '/pages/pay-success/pay-success?id=' + order.id })
      } else {
        wx.showToast({ title: '已取消支付', icon: 'none' })
        this.refresh()
      }
    })
  },

  onCancel() {
    wx.showModal({
      title: '提示',
      content: '确定要取消该订单吗？',
      success: res => {
        if (res.confirm) {
          mock.cancelOrder(this.id)
          wx.showToast({ title: '订单已取消', icon: 'none' })
          this.refresh()
        }
      }
    })
  },

  // demo：模拟卖家发货（待发货 → 待收货）
  onShip() {
    wx.showModal({
      title: '模拟发货',
      content: 'Demo 中模拟商家发货，订单将变为「待收货」',
      success: res => {
        if (res.confirm) {
          mock.shipOrder(this.id)
          wx.showToast({ title: '已发货', icon: 'success' })
          this.refresh()
        }
      }
    })
  },

  onConfirm() {
    wx.showModal({
      title: '确认收货',
      content: '确认已收到商品吗？',
      success: res => {
        if (res.confirm) {
          mock.confirmOrder(this.id)
          wx.showToast({ title: '已确认收货', icon: 'success' })
          this.refresh()
        }
      }
    })
  },

  onDelete() {
    wx.showModal({
      title: '提示',
      content: '确定要删除该订单吗？删除后不可恢复',
      success: res => {
        if (res.confirm) {
          mock.deleteOrder(this.id)
          wx.showToast({ title: '已删除', icon: 'none' })
          setTimeout(() => wx.navigateBack(), 600)
        }
      }
    })
  },

  onBuyAgain() {
    const order = this.data.order
    if (!order) return
    order.items.forEach(it => cart.addToCart(it, it.count))
    wx.showToast({ title: '已加入购物车', icon: 'success' })
    setTimeout(() => wx.switchTab({ url: '/pages/cart/cart' }), 800)
  }
})
