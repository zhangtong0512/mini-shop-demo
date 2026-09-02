const member = require('../../utils/member')

Page({
  data: {
    levels: [],
    currentLevel: 1
  },

  onLoad() {
    this.loadData()
  },

  loadData() {
    const levels = member.getAllLevels()
    const current = member.getCurrentLevel()
    this.setData({
      levels: levels.map(l => ({
        ...l,
        isCurrent: l.level === current.level,
        benefitsText: this.formatBenefits(l.benefits)
      })),
      currentLevel: current.level
    })
  },

  formatBenefits(benefits) {
    const items = []
    if (benefits.freeShipping) items.push('免运费')
    items.push('每月' + benefits.couponMonthly + '张优惠券')
    if (benefits.priorityShip) items.push('优先发货')
    if (benefits.exclusiveSale) items.push('专属特卖')
    return items
  }
})
