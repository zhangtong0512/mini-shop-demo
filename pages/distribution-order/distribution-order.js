const distribution = require('../../utils/distribution')

Page({
  data: {
    tabs: [
      { key: -1, name: '全部' },
      { key: 0, name: '待结算' },
      { key: 1, name: '已结算' },
      { key: 2, name: '已失效' }
    ],
    currentTab: -1,
    records: [],
    stats: {}
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const userId = 'user_001'
    const agent = distribution.getAgentByUserId(userId)
    if (!agent) return

    const records = distribution.getCommissionRecords(agent.agentId)
    const stats = distribution.getCommissionStats(agent.agentId)
    
    this.setData({
      agent,
      allRecords: records,
      stats
    })
    this.filterRecords()
  },

  filterRecords() {
    const { currentTab, allRecords } = this.data
    let filtered = allRecords || []
    if (currentTab !== -1) {
      filtered = filtered.filter(r => r.status === currentTab)
    }
    filtered.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
    this.setData({ records: filtered })
  },

  onTabChange(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ currentTab: key })
    this.filterRecords()
  },

  onRecordTap(e) {
    const { id } = e.currentTarget.dataset
    wx.showToast({ title: '查看订单详情', icon: 'none' })
  }
})
