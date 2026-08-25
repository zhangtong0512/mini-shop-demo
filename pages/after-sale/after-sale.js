const mock = require('../../utils/mock')
const afterSale = require('../../utils/after-sale')

const REASONS = ['质量问题', '不想要了', '拍错/多拍', '尺寸不符', '其他']

Page({
  data: {
    order: null,
    item: null,
    amount: 0,
    type: 'refund',
    reason: '',
    remark: '',
    submitting: false,
    reasons: REASONS
  },

  onLoad(options) {
    this.orderId = Number(options.orderId)
    this.goodsId = Number(options.goodsId)
    this.skuKey = options.sku || ''
    const order = mock.getOrderById(this.orderId)
    const item = (order && order.items.find(it => it.id === this.goodsId && (it.skuKey || '') === this.skuKey)) || null
    this.setData({
      order,
      item,
      amount: item ? (item.price || 0) * item.count : 0
    })
  },

  onTypeTap(e) {
    this.setData({ type: e.currentTarget.dataset.type })
  },

  onReasonTap(e) {
    this.setData({ reason: e.currentTarget.dataset.reason })
  },

  onRemark(e) {
    this.setData({ remark: e.detail.value })
  },

  onSubmit() {
    if (this.data.submitting) return
    if (!this.data.item) return
    if (!this.data.reason) {
      wx.showToast({ title: '请选择退款原因', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    const res = afterSale.applyRefund(this.data.order, this.data.item, {
      type: this.data.type,
      reason: this.data.reason,
      remark: this.data.remark
    })
    if (!res.ok) {
      this.setData({ submitting: false })
      wx.showToast({ title: res.msg, icon: 'none' })
      return
    }
    wx.showToast({ title: '申请已提交', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 600)
  }
})
