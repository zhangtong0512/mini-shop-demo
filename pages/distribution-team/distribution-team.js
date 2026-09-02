const distribution = require('../../utils/distribution')

Page({
  data: {
    teamMembers: [],
    stats: {
      teamCount: 0,
      todayCount: 0,
      monthCount: 0
    }
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

    const subAgents = distribution.getSubAgents(agent.agentId)
    const teamMembers = subAgents.map(a => ({
      ...a,
      levelText: a.level === 1 ? '一级' : '二级'
    }))

    const today = new Date().toDateString()
    const month = new Date().getMonth()

    this.setData({
      teamMembers,
      stats: {
        teamCount: agent.teamCount,
        todayCount: teamMembers.filter(m => new Date(m.applyTime).toDateString() === today).length,
        monthCount: teamMembers.filter(m => new Date(m.applyTime).getMonth() === month).length
      }
    })
  },

  onMemberTap(e) {
    const { id } = e.currentTarget.dataset
    wx.showToast({ title: '查看成员详情', icon: 'none' })
  },

  onInviteTap() {
    wx.showToast({ title: '分享邀请链接', icon: 'none' })
  }
})
