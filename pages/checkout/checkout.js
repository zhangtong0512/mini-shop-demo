const cart = require('../../utils/cart')
const mock = require('../../utils/mock')
const address = require('../../utils/address')
const pay = require('../../utils/pay')
const config = require('../../utils/config')
const coupon = require('../../utils/coupon')
const points = require('../../utils/points')

Page({
  data: {
    source: 'cart', // cart 购物车结算 / buynow 立即购买
    items: [],
    goodsAmount: 0,
    freight: 0,
    totalPrice: 0,
    totalCount: 0,
    address: null,
    remark: '',
    usableCoupons: [], // 当前可用优惠券（满减门槛已筛）
    couponId: 0,
    couponAmount: 0,
    pointsBalance: 0,
    pointsUsable: 0,
    pointsAmount: 0,
    usePoints: false,
    pointsCanUse: false,
    submitting: false,
    freeShippingThreshold: config.FREE_SHIPPING_THRESHOLD
  },

  onLoad(options) {
    const source = options.from === 'buynow' ? 'buynow' : 'cart'
    this.setData({ source })
    if (source === 'buynow') {
      this._buyNow = {
        id: Number(options.id),
        count: Math.max(1, Math.min(Number(options.count) || 1, 99)),
        skuKey: options.sku || ''
      }
    }
    this.refresh()
  },

  refresh() {
    let items = []
    if (this.data.source === 'buynow' && this._buyNow) {
      const g = mock.getGoodsById(this._buyNow.id)
      if (!g) {
        wx.showToast({ title: '商品不存在或已下架', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 900)
        return
      }
      const item = mock.toOrderItem(g, this._buyNow.count, this._buyNow.skuKey)
      if (mock.isFlashActive(g)) item.price = mock.getEffectivePrice(g) // 闪购商品按秒杀价结算
      items = [item]
    } else {
      // 购物车条目只取订单所需字段（剥离 key/selected 等购物车态字段）
      items = cart.getSelectedItems().map(i => ({
        id: i.id,
        title: i.title,
        emoji: i.emoji,
        image: i.image,
        price: i.price,
        count: i.count,
        skuKey: i.skuKey || '',
        spec: i.spec || ''
      }))
      if (items.length === 0) {
        wx.showToast({ title: '没有待结算的商品', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 900)
        return
      }
    }

    const goodsAmount = items.reduce((s, i) => s + i.price * i.count, 0)
    const totalCount = items.reduce((s, i) => s + i.count, 0)
    // 满额免运费，否则收固定运费
    const freight = goodsAmount >= config.FREE_SHIPPING_THRESHOLD ? 0 : config.SHIPPING_FEE
    // 可用优惠券；已选券失效（已用/过期/不满足门槛）时自动清空
    const usableCoupons = coupon.getUsableCoupons(goodsAmount)
    let couponId = this.data.couponId
    if (couponId && !usableCoupons.some(c => c.id === couponId)) {
      couponId = 0
    }
    const selected = couponId ? coupon.getCouponById(couponId) : null
    const couponAmount = selected ? Math.min(selected.amount, goodsAmount) : 0

    // 积分抵扣：100 积分 = 1 元；上限按「商品金额 − 优惠券」计算，避免叠加超扣为负；余额不足自动关闭
    const pointsBalance = points.getBalance()
    const disc = points.calcPointsDiscount(goodsAmount - couponAmount, pointsBalance)
    let usePoints = this.data.usePoints
    if (usePoints && !disc.canUse) usePoints = false
    const pointsAmount = usePoints ? disc.pointsAmount : 0

    this.setData({
      items,
      goodsAmount,
      freight,
      usableCoupons,
      couponId,
      couponAmount,
      pointsBalance,
      pointsUsable: disc.usablePoints,
      pointsAmount,
      usePoints,
      pointsCanUse: disc.canUse,
      totalPrice: goodsAmount + freight - couponAmount - pointsAmount,
      totalCount,
      // 用户已选过地址则保留，否则用默认地址
      address: this.data.address || address.getDefaultAddress()
    })
  },

  // 使用积分抵扣开关
  onPointsTap() {
    if (!this.data.pointsCanUse) {
      wx.showToast({ title: '积分不足 100，暂不可用', icon: 'none' })
      return
    }
    this.setData({ usePoints: !this.data.usePoints })
    this.refresh()
  },

  // 选择优惠券：跳优惠券页（选择模式），经事件通道回传
  onCouponTap() {
    if (!this.data.usableCoupons.length) {
      wx.showToast({ title: '暂无可用优惠券', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/coupon/coupon?mode=select',
      events: {
        selectCoupon: data => {
          this.setData({ couponId: data.coupon ? data.coupon.id : 0 })
          this.refresh()
        }
      }
    })
  },

  onAddressTap() {
    wx.navigateTo({
      url: '/pages/address/address?mode=select',
      events: {
        selectAddress: data => {
          this.setData({ address: data.address })
        }
      }
    })
  },

  onRemark(e) {
    this.setData({ remark: e.detail.value })
  },

  onSubmit() {
    if (this.data.submitting) return
    if (!this.data.address) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }
    const stockRes = mock.checkStock(this.data.items)
    if (!stockRes.ok) {
      wx.showToast({ title: stockRes.msg, icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中' })

    // 模拟网络提交耗时
    setTimeout(() => {
      const order = mock.createOrder({
        items: this.data.items,
        address: this.data.address,
        remark: this.data.remark,
        goodsAmount: this.data.goodsAmount,
        freight: this.data.freight,
        couponId: this.data.couponId,
        couponAmount: this.data.couponAmount,
        pointsUsed: this.data.usePoints ? this.data.pointsUsable : 0,
        pointsAmount: this.data.usePoints ? this.data.pointsAmount : 0,
        totalPrice: this.data.totalPrice,
        totalCount: this.data.totalCount
      })
      if (!order) {
        wx.hideLoading()
        this.setData({ submitting: false })
        wx.showToast({ title: '库存不足，请调整数量', icon: 'none' })
        return
      }
      // 购物车结算才清空已选商品；立即购买不经过购物车
      if (this.data.source === 'cart') {
        cart.removeSelected()
      }
      wx.hideLoading()

      pay.payOrder(order, { sheet: this.selectComponent('#paySheet') }).then(paid => {
        if (paid) {
          wx.redirectTo({ url: '/pages/pay-success/pay-success?id=' + order.id })
        } else {
          this.setData({ submitting: false })
          wx.showToast({ title: '订单已生成，待支付', icon: 'none' })
          setTimeout(() => wx.switchTab({ url: '/pages/order/order' }), 1200)
        }
      })
    }, 600)
  }
})
