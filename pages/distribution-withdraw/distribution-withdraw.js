const distribution = require('../../utils/distribution')

Page({
  data: {
    agent: null,
    withdrawAmount: '',
    records: [],
    banks: [
      { id: 1, name: '工商银行', card: '**** **** **** 1234' },
      { id: 2, name: '支付宝', card: '138****8001' }
    ],
    selectedBank: null
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

    const records = distribution.getWithdrawRecords(agent.agentId)
    records.sort((a, b) => new Date(b.applyTime) - new Date(a.applyTime))

    this.setData({
      agent,
      records,
      selectedBank: this.data.banks[0]
    })
  },

  onAmountInput(e) {
    this.setData({ withdrawAmount: e.detail.value })
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
  }
})
