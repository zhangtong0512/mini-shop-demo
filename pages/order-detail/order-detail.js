const mock = require('../../utils/mock')
const cart = require('../../utils/cart')
const pay = require('../../utils/pay')
const review = require('../../utils/review')
const afterSale = require('../../utils/after-sale')

const STATUS_META = {
  1: { icon: '💰', title: '等待付款', sub: '订单提交成功，请尽快完成支付' },
  2: { icon: '📦', title: '卖家发货中', sub: '付款成功，等待卖家发货' },
  3: { icon: '🚚', title: '已发货', sub: '商品正在路上，请注意查收' },
  4: { icon: '✅', title: '交易完成', sub: '感谢您的购买，期待再次光临' },
  5: { icon: '⏹️', title: '订单已取消', sub: '很遗憾，该订单已取消' },
  6: { icon: '🔧', title: '售后处理中', sub: '您的售后申请已提交，请耐心等待' },
  7: { icon: '💸', title: '已退款', sub: '退款已原路退回，积分已返还' }
}

const AFTER_SALE_STATUS_TEXT = {
  pending: '申请中',
  refunded: '已退款',
  rejected: '已拒绝'
}

const AFTER_SALE_TYPE_TEXT = {
  refund: '仅退款',
  return: '退款退货'
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
    if (order.items) {
      const records = afterSale.getByOrder(order.id)
      order.items.forEach(it => {
        it.reviewed = review.hasReviewed(order.id, it.id)
        const rec = records.find(r => r.goodsId === it.id && (r.skuKey || '') === (it.skuKey || ''))
        it.afterSaleStatus = rec ? rec.status : ''
        // 已申请且未拒绝则不再显示申请入口；可申请：待发货/待收货/已完成 且无有效售后
        it.canApplyAfterSale = [2, 3, 4].indexOf(order.status) > -1 && !(rec && rec.status !== 'rejected')
      })
      order.allReviewed = order.items.every(it => it.reviewed)
      order.afterSales = records.map(r => Object.assign({}, r, {
        statusText: AFTER_SALE_STATUS_TEXT[r.status] || r.status,
        typeText: AFTER_SALE_TYPE_TEXT[r.type] || r.type
      }))
    }
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

  // 申请退款（待发货 / 待收货）：选原因 → 确认 → 提交
  onApplyRefund() {
    const order = this.data.order
    if (!order || (order.status !== 2 && order.status !== 3)) return
    const reasons = ['不想要了', '商品破损 / 质量问题', '尺码 / 规格不合适', '其他']
    wx.showActionSheet({
      itemList: reasons,
      success: res => {
        const reason = reasons[res.tapIndex]
        wx.showModal({
          title: '申请退款',
          content: '确定申请退款吗？\n理由：' + reason + '\n退款后库存将释放',
          success: r => {
            if (r.confirm) {
              mock.applyRefund(this.id, reason)
              wx.showToast({ title: '退款申请已提交', icon: 'none' })
              this.refresh()
            }
          }
        })
      }
    })
  },

  // 撤销退款申请（用户）
  onCancelRefund() {
    wx.showModal({
      title: '撤销申请',
      content: '确定撤销本次退款申请吗？',
      success: res => {
        if (res.confirm) {
          mock.cancelRefund(this.id)
          wx.showToast({ title: '已撤销申请', icon: 'none' })
          this.refresh()
        }
      }
    })
  },

  // demo：模拟商家同意退款（退款中 → 已退款）
  onAgreeRefund() {
    wx.showModal({
      title: '模拟同意退款',
      content: 'Demo 中模拟商家同意退款，订单将变为「已退款」，积分原路退回',
      success: res => {
        if (res.confirm) {
          mock.agreeRefund(this.id)
          wx.showToast({ title: '退款成功', icon: 'success' })
          this.refresh()
        }
      }
    })
  },

  // 复制订单号
  onCopyOrderNo() {
    const order = this.data.order
    if (!order) return
    wx.setClipboardData({
      data: order.orderNo,
      success: () => wx.showToast({ title: '订单号已复制', icon: 'success' })
    })
  },

  // 查看物流（待收货 / 已完成）
  onLogistics() {
    wx.navigateTo({ url: '/pages/logistics/logistics?id=' + this.id })
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

  // 评价单个商品
  onReviewItem(e) {
    const goodsId = Number(e.currentTarget.dataset.gid)
    wx.navigateTo({
      url: '/pages/review-submit/review-submit?orderId=' + this.data.order.id + '&goodsId=' + goodsId
    })
  },

  // 去评价：跳到第一个未评价的商品
  onReview() {
    const order = this.data.order
    const first = order.items.find(it => !it.reviewed)
    if (!first) return
    wx.navigateTo({
      url: '/pages/review-submit/review-submit?orderId=' + order.id + '&goodsId=' + first.id
    })
  },

  onBuyAgain() {
    const order = this.data.order
    if (!order) return
    order.items.forEach(it => cart.addToCart(it, it.count, it.skuKey))
    wx.showToast({ title: '已加入购物车', icon: 'success' })
    setTimeout(() => wx.switchTab({ url: '/pages/cart/cart' }), 800)
  },

  // 申请售后（按商品）
  onApplyAfterSale(e) {
    const goodsId = Number(e.currentTarget.dataset.gid)
    const skuKey = e.currentTarget.dataset.sku || ''
    wx.navigateTo({
      url: '/pages/after-sale/after-sale?orderId=' + this.data.order.id + '&goodsId=' + goodsId + '&sku=' + encodeURIComponent(skuKey)
    })
  },

  // demo：卖家处理售后（同意退款 → 回补库存 / 拒绝）
  onHandleRefund(e) {
    const recordId = Number(e.currentTarget.dataset.rid)
    const action = e.currentTarget.dataset.action
    const content = action === 'approve' ? '同意后将回补库存并向买家退款' : '确定要拒绝该售后申请吗？'
    wx.showModal({
      title: '卖家处理',
      content,
      success: res => {
        if (res.confirm) {
          afterSale.handleRefund(recordId, action)
          wx.showToast({ title: action === 'approve' ? '已同意退款' : '已拒绝申请', icon: 'none' })
          this.refresh()
        }
      }
    })
  }
})
