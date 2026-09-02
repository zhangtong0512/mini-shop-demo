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
    const group = groupBuy.getGroupById(this.groupId)
    if (!group) {
      wx.showToast({ title: '拼团不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const goods = mock.getGoodsById(group.goodsId)
    const userInfo = user.getUserInfo()
    const userId = userInfo ? userInfo.id : ''
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

  onJoinTap() {
    const userInfo = user.getUserInfo()
    if (!userInfo) {
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

    this.setData({ loading: true })
    const result = groupBuy.joinGroup(
      this.groupId,
      userInfo.id,
      userInfo.nickname,
      userInfo.avatar
    )
    this.setData({ loading: false })

    if (result.ok) {
      wx.showToast({ 
        title: result.success ? '拼团成功！' : '已参与拼团', 
        icon: 'success' 
      })
      this.loadData()
    } else {
      wx.showToast({ title: result.msg, icon: 'none' })
    }
  },

  onShareAppMessage() {
    const { group, goods } = this.data
    return {
      title: `快来拼团！${goods ? goods.title : '精选商品'}`,
      path: `/pages/group-detail/group-detail?id=${group.id}`
    }
  },

  onBuyNow() {
    const { goods, group } = this.data
    if (!goods) return
    
    wx.navigateTo({
      url: `/pages/checkout/checkout?from=buynow&id=${goods.id}&count=1&sku=&groupPrice=${group.groupPrice}`
    })
  }
})
