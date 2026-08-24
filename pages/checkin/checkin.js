const points = require('../../utils/points')

Page({
  data: {
    balance: 0,
    totalDays: 0,
    checkedToday: false,
    ledger: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const p = points.getPoints()
    this.setData({
      balance: p.balance,
      totalDays: p.totalDays,
      checkedToday: points.isCheckedToday(),
      ledger: p.ledger
    })
  },

  onCheckIn() {
    if (this.data.checkedToday) return
    const res = points.checkIn()
    if (!res.ok) return
    this.refresh()
    wx.showToast({ title: '签到成功 +' + res.points + ' 积分', icon: 'success' })
  }
})
