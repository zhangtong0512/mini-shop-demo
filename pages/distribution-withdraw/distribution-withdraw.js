const distribution = require('../../utils/distribution')
const user = require('../../utils/user')

Page({
  data: {
    isAgent: false,
    agent: null,
    withdrawAmount: '',
    records: [],
    banks: [
      { id: 1, name: '工商银行', card: '**** **** **** 1234' },
      { id: 2, name: '支付宝', card: '138****8001' }
    ],
    selectedBank: null,
    minWithdraw: 10
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
    const config = distribution.getConfig()
    if (!agent || agent.status !== 1) {
      this.setData({ isAgent: false, agent: null, records: [], minWithdraw: config.minWithdraw })
      return
    }

    const records = distribution.getWithdrawRecords(agent.agentId)
    records.sort((a, b) => new Date(b.applyTime) - new Date(a.applyTime))

    this.setData({
      isAgent: true,
      agent,
      records,
      minWithdraw: config.minWithdraw,
      selectedBank: this.data.selectedBank || this.data.banks[0]
    })
  },

  onAmountInput(e) {
    this.setData({ withdrawAmount: e.detail.value })
  },

  onQuickAmount(e) {
    const amount = e.currentTarget.dataset.amount
    // 「全部提现」时取当前可提现余额
    this.setData({ withdrawAmount: String(amount === 'all' ? this.data.agent.availableCommission : amount) })
  },

  onBankSelect(e) {
    const { id } = e.currentTarget.dataset
    const bank = this.data.banks.find(b => b.id === id)
    this.setData({ selectedBank: bank })
  },

  onWithdraw() {
    const { agent, withdrawAmount, selectedBank } = this.data
    if (!agent) return

    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }

    const config = distribution.getConfig()
    if (amount < config.minWithdraw) {
      wx.showToast({ title: '最低提现' + config.minWithdraw + '元', icon: 'none' })
      return
    }

    if (amount > agent.availableCommission) {
      wx.showToast({ title: '可提现余额不足', icon: 'none' })
      return
    }

    if (!selectedBank) {
      wx.showToast({ title: '请选择提现账户', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认提现',
      content: `提现 ¥${amount.toFixed(2)} 到 ${selectedBank.name}`,
      success: (res) => {
        if (res.confirm) {
          const result = distribution.applyWithdraw(
            agent.agentId,
            amount,
            selectedBank.name,
            selectedBank.card
          )
          if (result.ok) {
            wx.showToast({ title: result.msg, icon: 'success' })
            this.setData({ withdrawAmount: '' })
            this.loadData()
          } else {
            wx.showToast({ title: result.msg, icon: 'none' })
          }
        }
      }
    })
  },

  // 演示用：模拟平台打款结果，让提现有终态（处理中 → 已到账 / 已拒绝退回余额）
  onAuditTap(e) {
    const { id } = e.currentTarget.dataset
    const record = this.data.records.find(r => r.id === id)
    if (!record || record.status !== 0) return

    wx.showActionSheet({
      itemList: ['模拟打款成功（已到账）', '模拟打款失败（退回余额）'],
      success: res => {
        const status = res.tapIndex === 0 ? 1 : 2
        const result = distribution.auditWithdraw(id, status)
        wx.showToast({ title: result.msg, icon: result.ok ? 'success' : 'none' })
        this.loadData()
      }
    })
  }
})
