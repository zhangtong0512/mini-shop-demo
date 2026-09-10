const mock = require('../../utils/mock')
const groupBuy = require('../../utils/group-buy')
const user = require('../../utils/user')

Page({
  data: {
    group: null,
    goods: null,
    remainText: '',
    isOwner: false,
    canJoin: false,
    loading: false
  },

  onLoad(options) {
    this.groupId = options.id
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    // 进页面先把过期未成团的团判定为失败（并发失败通知）
    groupBuy.checkGroupStatus(this.groupId)

    const group = groupBuy.getGroupById(this.groupId)
    if (!group) {
      wx.showToast({ title: '拼团不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const goods = mock.getGoodsById(group.goodsId)
    const userId = user.getUserId()
    const isOwner = group.ownerId === userId
    const canJoin = !isOwner && 
      group.status === 0 && 
      !groupBuy.isGroupExpired(group) &&
      group.currentCount < group.requiredCount &&
      !group.members.some(m => m.userId === userId)

    const remainTime = groupBuy.getGroupRemainTime(group)
    const remainText = groupBuy.formatRemainTime(remainTime)

    this.setData({ group, goods, isOwner, canJoin, remainText })
    
    // 启动倒计时
    this.startCountdown()
  },

  startCountdown() {
    this.stopCountdown()
    if (this.data.group && this.data.group.status === 0) {
      this._timer = setInterval(() => {
        const remainTime = groupBuy.getGroupRemainTime(this.data.group)
        const remainText = groupBuy.formatRemainTime(remainTime)
        this.setData({ remainText })
        if (remainTime <= 0) {
          this.stopCountdown()
          this.loadData()
        }
      }, 1000)
    }
  },

  stopCountdown() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  onUnload() {
    this.stopCountdown()
  },

  // 立即参团：走拼团订单页「下单 + 支付」，付款成功才计入拼团
  onJoinTap() {
    const { group, goods } = this.data
    if (!group || !goods) return

    if (!user.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: res => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/user-info/user-info' })
          }
        }
      })
      return
    }
    if (!this.data.canJoin) {
      wx.showToast({ title: this.data.isOwner ? '您已开团，等待好友加入' : '当前不可参团', icon: 'none' })
      return
    }

    wx.navigateTo({
      url: '/pages/group-order/group-order?goodsId=' + goods.id + '&groupId=' + group.id + '&isGroup=true'
    })
  },

  // 分享给好友（分享按钮用 open-type="share" 时不会触发本方法，这里用于「分享」浮层入口）
  onShareTap() {
    wx.showToast({ title: '请点右上角「···」或下方分享按钮', icon: 'none' })
  },

  onShareAppMessage() {
    const { group, goods } = this.data
    return {
      title: `快来拼团！${goods ? goods.title : '精选商品'}`,
      path: `/pages/group-detail/group-detail?id=${group.id}`
    }
  },

  // 拼团成功后查看自己的订单（订单号在下单支付时回写到拼团上）
  onBuyNow() {
    const { group } = this.data
    if (!group) return
    const order = mock.getOrders().find(o => o.orderNo === group.orderNo)
    if (order) {
      wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + order.id })
      return
    }
    // 种子拼团 / 非本人拼团没有关联订单，引导去拼团专区自己开团
    wx.showModal({
      title: '查看订单',
      content: '未找到该拼团关联的订单，需要自己开一个团吗？',
      confirmText: '去开团',
      success: r => {
        if (r.confirm) {
          wx.redirectTo({ url: '/pages/group-order/group-order?goodsId=' + group.goodsId + '&isGroup=false' })
        }
      }
    })
  },

  // 拼团失败 → 回拼团专区
  onBackToGroup() {
    wx.redirectTo({ url: '/pages/group-buy/group-buy' })
  }
})
