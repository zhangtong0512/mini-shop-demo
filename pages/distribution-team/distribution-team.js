const distribution = require('../../utils/distribution')
const user = require('../../utils/user')

Page({
  data: {
    isAgent: false,
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
    // 当前登录用户的分销员身份（不再硬编码 user_001）
    const agent = distribution.getAgentByUserId(user.getUserId())
    if (!agent || agent.status !== 1) {
      this.setData({ isAgent: false, teamMembers: [], stats: { teamCount: 0, todayCount: 0, monthCount: 0 } })
      return
    }

    const subAgents = distribution.getSubAgents(agent.agentId)
    const teamMembers = subAgents.map(a => ({
      ...a,
      levelText: a.level === 1 ? '一级' : '二级'
    }))

    const today = new Date().toDateString()
    const month = new Date().getMonth()

    this.setData({
      isAgent: true,
      teamMembers,
      stats: {
        // 团队人数以实际下级为准，避免与展示数据对不上
        teamCount: teamMembers.length || agent.teamCount,
        todayCount: teamMembers.filter(m => new Date(m.applyTime).toDateString() === today).length,
        monthCount: teamMembers.filter(m => new Date(m.applyTime).getMonth() === month).length
      }
    })
  },

  onMemberTap(e) {
    const { id } = e.currentTarget.dataset
    const member = this.data.teamMembers.find(m => m.agentId === id)
    if (!member) return
    wx.showModal({
      title: member.name,
      content: '手机号：' + member.phone + '\n加入时间：' + (member.applyTime || '').slice(0, 10) +
        '\n贡献佣金：¥' + member.totalCommission,
      showCancel: false
    })
  },

  onInviteTap() {
    wx.showToast({ title: '请点右上角「···」分享邀请', icon: 'none' })
  },

  onShareAppMessage() {
    const agent = distribution.getAgentByUserId(user.getUserId())
    return {
      title: '加入精选商城分销，一起赚佣金',
      path: agent ? '/pages/index/index?agentId=' + agent.agentId : '/pages/index/index'
    }
  }
})
