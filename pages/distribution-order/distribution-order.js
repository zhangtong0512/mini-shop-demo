const distribution = require('../../utils/distribution')
const user = require('../../utils/user')
const mock = require('../../utils/mock')

Page({
  data: {
    isAgent: false,
    agent: null,
    tabs: [
      { key: -1, name: '全部' },
      { key: 0, name: '待结算' },
      { key: 1, name: '已结算' },
      { key: 2, name: '已失效' }
    ],
    currentTab: -1,
    allRecords: [],
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
    // 当前登录用户的分销员身份
    const agent = distribution.getAgentByUserId(user.getUserId())
    if (!agent || agent.status !== 1) {
      this.setData({ isAgent: false, agent: null, allRecords: [], records: [], stats: {} })
      return
    }

    const records = distribution.getCommissionRecords(agent.agentId)
    const stats = distribution.getCommissionStats(agent.agentId)

    this.setData({
      isAgent: true,
      agent,
      allRecords: records,
      stats
    })
    this.filterRecords()
  },

  filterRecords() {
    const { currentTab, allRecords } = this.data
    let filtered = (allRecords || []).slice()
    if (currentTab !== -1) {
      filtered = filtered.filter(r => r.status === currentTab)
    }
    filtered.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
    this.setData({ records: filtered })
  },

  onTabChange(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ currentTab: key === undefined ? -1 : Number(key) })
    this.filterRecords()
  },

  // 点佣金记录直接跳到对应订单详情（种子数据的订单号在本地订单里不存在，给出兜底提示）
  onRecordTap(e) {
    const { id } = e.currentTarget.dataset
    const record = (this.data.allRecords || []).find(r => r.id === id)
    if (!record) return
    const order = mock.getOrders().find(o => o.orderNo === record.orderId)
    if (order) {
      wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + order.id })
    } else {
      wx.showModal({
        title: '推广订单 ' + record.orderId,
        content: '订单金额 ¥' + record.orderAmount + '\n佣金 ¥' + record.commission +
          '\n比例 ' + (record.rate ? Math.round(record.rate * 1000) / 10 + '%' : '—'),
        showCancel: false
      })
    }
  }
})
