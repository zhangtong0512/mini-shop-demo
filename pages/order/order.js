const mock = require('../../utils/mock')
const pay = require('../../utils/pay')

const TABS = [
  { key: 'all', name: '全部' },
  { key: 1, name: '待付款' },
  { key: 2, name: '待发货' },
  { key: 3, name: '待收货' },
  { key: 4, name: '已完成' },
  { key: 6, name: '售后' },
  { key: 7, name: '已退款' },
  { key: 5, name: '已取消' }
]

Page({
  data: {
    tabs: TABS,
    activeTab: 'all',
    orders: []
  },

  onLoad(options) {
    if (options.tab) {
      this.setData({ activeTab: Number(options.tab) })
    }
  },

  onShow() {
    // 「我的」页经 switchTab 跳入时携带的指定 tab（switchTab 无法带参，走全局临时状态）
    const tab = getApp().globalData.orderTab
    if (tab) {
      getApp().globalData.orderTab = null
      this.setData({ activeTab: tab })
    }
    this.refresh()
  },

  onHide() {
    this.clearTimer()
  },

  onUnload() {
    this.clearTimer()
  },

  onTabTap(e) {
    this.setData({ activeTab: e.currentTarget.dataset.key })
    this.refresh()
  },

  refresh() {
    mock.cancelExpiredOrders()
    const all = mock.getOrders()
    const key = this.data.activeTab
    const orders = (key === 'all' ? all : all.filter(o => o.status === key)).map(o => {
      return Object.assign({}, o, {
        statusText: mock.statusText(o.status),
        remainText: mock.remainText(o)
      })
    })
    this.setData({ orders })
    this.syncTimer()
  },

  // 有待付款订单时每秒刷新倒计时
  syncTimer() {
    const hasPending = this.data.orders.some(o => o.status === 1)
    if (hasPending && !this._timer) {
      this._timer = setInterval(() => this.refresh(), 1000)
    } else if (!hasPending && this._timer) {
      this.clearTimer()
    }
  },

  clearTimer() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  onOrderTap(e) {
    wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + e.currentTarget.dataset.id })
  },

  onPay(e) {
    const id = Number(e.currentTarget.dataset.id)
    const order = mock.getOrderById(id)
    if (!order) return
    pay.payOrder(order, { sheet: this.selectComponent('#paySheet') }).then(paid => {
      if (paid) {
        wx.navigateTo({ url: '/pages/pay-success/pay-success?id=' + order.id })
      } else {
        wx.showToast({ title: '已取消支付', icon: 'none' })
        this.refresh()
      }
    })
  },

  onCancel(e) {
    const id = Number(e.currentTarget.dataset.id)
    wx.showModal({
      title: '提示',
      content: '确定要取消该订单吗？',
      success: res => {
        if (res.confirm) {
          mock.cancelOrder(id)
          this.refresh()
        }
      }
    })
  },

  onConfirm(e) {
    const id = Number(e.currentTarget.dataset.id)
    wx.showModal({
      title: '确认收货',
      content: '确认已收到商品吗？',
      success: res => {
        if (res.confirm) {
          mock.confirmOrder(id)
          wx.showToast({ title: '已确认收货', icon: 'success' })
          this.refresh()
        }
      }
    })
  },

  onGoShopping() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
