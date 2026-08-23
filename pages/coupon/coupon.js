const coupon = require('../../utils/coupon')

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function fmtDate(ts) {
  const d = new Date(ts)
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

Page({
  data: {
    mode: 'center', // center 领券中心 / mine 我的券
    claimables: [], // 领券中心列表（含是否已领取）
    myCoupons: [],  // 我的券（含状态文案 / 有效期）
    selectMode: false
  },

  onLoad(options) {
    if (options.mode === 'select') {
      this.setData({ mode: 'mine', selectMode: true })
      wx.setNavigationBarTitle({ title: '选择优惠券' })
    }
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const now = Date.now()
    const myCoupons = coupon.getCoupons().map(c => {
      return Object.assign({}, c, {
        statusText: coupon.statusText(c.status),
        expireText: fmtDate(c.expireTime)
      })
    })
    const claimables = coupon.getTemplates().map(t => {
      return Object.assign({}, t, { claimed: coupon.hasClaimed(t.tid) })
    })
    this.setData({ myCoupons, claimables })
  },

  onTabTap(e) {
    this.setData({ mode: e.currentTarget.dataset.mode })
  },

  onReceive(e) {
    const c = coupon.receiveCoupon(e.currentTarget.dataset.tid)
    if (!c) {
      wx.showToast({ title: '该券已领取过了', icon: 'none' })
      return
    }
    wx.showToast({ title: '领取成功', icon: 'success' })
    this.refresh()
  },

  // 选择模式：点选一张未使用券回传（沿用地址选择的事件通道模式）
  onPick(e) {
    if (!this.data.selectMode) return
    const c = coupon.getCouponById(e.currentTarget.dataset.id)
    if (!c || c.status !== 0) {
      wx.showToast({ title: '该券不可用', icon: 'none' })
      return
    }
    this.emit(c)
  },

  // 选择模式：不使用优惠券
  onNoCoupon() {
    if (!this.data.selectMode) return
    this.emit(null)
  },

  emit(couponObj) {
    const ec = this.getOpenerEventChannel()
    if (ec && ec.emit) {
      ec.emit('selectCoupon', { coupon: couponObj })
    }
    wx.navigateBack()
  }
})
