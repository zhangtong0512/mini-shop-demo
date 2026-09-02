const member = require('../../utils/member')
const points = require('../../utils/points')

Page({
  data: {
    memberInfo: null,
    pointsBalance: 0,
    todayChecked: false,
    showLevelRule: false
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const memberInfo = member.getMemberInfo()
    const pointsBalance = points.getBalance()
    const todayChecked = points.isCheckedToday()
    this.setData({ memberInfo, pointsBalance, todayChecked })
  },

  onLevelRuleTap() {
    wx.navigateTo({ url: '/pages/member-level/member-level' })
  },

  onCheckinTap() {
    if (this.data.todayChecked) {
      wx.showToast({ title: '今日已签到', icon: 'none' })
      return
    }
    const result = points.checkIn()
    if (result.ok) {
      member.addGrowth(5, '每日签到')
      this.loadData()
      wx.showToast({ title: '+' + result.points + '积分', icon: 'success' })
    }
  },

  onGrowthDetailTap() {
    wx.showModal({
      title: '成长值明细',
      content: this.data.memberInfo.growthLedger.slice(0, 10).map(l =>
        l.desc + ': ' + (l.points > 0 ? '+' : '') + l.points
      ).join('\n') || '暂无明细',
      showCancel: false
    })
  },

  onCouponTap() {
    wx.navigateTo({ url: '/pages/coupon/coupon' })
  },

  onFavoriteTap() {
    wx.navigateTo({ url: '/pages/favorite/favorite' })
  },

  onShareAppMessage() {
    return {
      title: '精选商城 · 会员中心',
      path: '/pages/index/index'
    }
  }
})
