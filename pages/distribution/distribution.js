const distribution = require('../../utils/distribution')
const mock = require('../../utils/mock')

Page({
  data: {
    isAgent: false,
    agent: null,
    stats: {},
    agentLevel: '',
    recentRecords: [],
    showApply: false,
    applyForm: { name: '', phone: '' }
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    // 模拟当前用户ID
    const userId = 'user_001'
    const agent = distribution.getAgentByUserId(userId)
    const isAgent = agent && agent.status === 1
    
    let stats = {}
    let recentRecords = []
    let agentLevel = ''
    
    if (isAgent) {
      stats = distribution.getCommissionStats(agent.agentId)
      recentRecords = distribution.getCommissionRecords(agent.agentId)
        .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
        .slice(0, 5)
      agentLevel = agent.level === 1 ? '一级分销' : '二级分销'
    }
    
    this.setData({ isAgent, agent, stats, agentLevel, recentRecords })
  },

  onApplyTap() {
    this.setData({ showApply: true })
  },

  onCloseApply() {
    this.setData({ showApply: false })
  },

  onApplyInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['applyForm.' + field]: e.detail.value })
  },

  onSubmitApply() {
    const { applyForm } = this.data
    if (!applyForm.name || !applyForm.phone) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    
    const result = distribution.applyAgent('user_new', applyForm.name, applyForm.phone)
    if (result.ok) {
      wx.showToast({ title: result.msg, icon: 'success' })
      this.setData({ showApply: false, applyForm: { name: '', phone: '' } })
    } else {
      wx.showToast({ title: result.msg, icon: 'none' })
    }
  },

  onWithdrawTap() {
    const { agent } = this.data
    if (!agent) return
    
    if (agent.availableCommission < distribution.getConfig().minWithdraw) {
      wx.showToast({ title: '可提现金额不足', icon: 'none' })
      return
    }
    
    wx.showModal({
      title: '申请提现',
      content: '可提现: ¥' + agent.availableCommission.toFixed(2),
      editable: true,
      placeholderText: '输入提现金额',
      success: (res) => {
        if (res.confirm && res.content) {
          const amount = parseFloat(res.content)
          if (isNaN(amount) || amount <= 0) {
            wx.showToast({ title: '请输入有效金额', icon: 'none' })
            return
          }
          const result = distribution.applyWithdraw(
            agent.agentId, 
            amount, 
            '工商银行', 
            '6222 **** **** 1234'
          )
          if (result.ok) {
            wx.showToast({ title: result.msg, icon: 'success' })
            this.loadData()
          } else {
            wx.showToast({ title: result.msg, icon: 'none' })
          }
        }
      }
    })
  },

  onShareTap() {
    const { agent } = this.data
    if (!agent) return
    
    wx.showActionSheet({
      itemList: ['生成海报', '分享给好友'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showToast({ title: '海报生成中...', icon: 'loading' })
        } else {
          wx.showToast({ title: '请使用右上角分享', icon: 'none' })
        }
      }
    })
  },

  onRecordTap() {
    wx.showToast({ title: '查看全部佣金记录', icon: 'none' })
  },

  onShareAppMessage() {
    const { agent } = this.data
    return {
      title: agent ? '我是分销员，分享赚钱' : '邀请您成为分销员',
      path: agent ? `/pages/index/index?agentId=${agent.agentId}` : '/pages/index/index'
    }
  }
})
