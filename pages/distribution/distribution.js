/**
 * 分销中心
 * 四种状态：none 未申请 / pending 审核中 / rejected 被拒绝 / agent 已是分销员
 * 用户 id 一律取真实登录态（utils/user），不再硬编码，保证申请 → 审核 → 佣金 → 提现是一条真实的数据链
 */
const distribution = require('../../utils/distribution')
const user = require('../../utils/user')

Page({
  data: {
    loggedIn: false,
    status: 'none', // none | pending | rejected | agent
    isAgent: false,
    agent: null,
    apply: null,
    stats: { total: 0, settled: 0, pending: 0, count: 0 },
    agentLevel: '',
    recentRecords: [],
    config: {}
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const loggedIn = user.isLoggedIn()
    const userId = user.getUserId()
    const config = distribution.getConfig()
    const mine = distribution.getMyDistribution(userId)
    const isAgent = mine.status === 'agent'
    const agent = mine.agent

    let stats = { total: 0, settled: 0, pending: 0, count: 0 }
    let recentRecords = []
    let agentLevel = ''

    if (isAgent) {
      stats = mine.stats
      recentRecords = distribution.getCommissionRecords(agent.agentId)
        .slice()
        .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
        .slice(0, 5)
      agentLevel = agent.level === 1 ? '一级分销' : '二级分销'
    }

    this.setData({
      loggedIn,
      status: mine.status,
      isAgent,
      agent,
      apply: mine.apply,
      stats,
      agentLevel,
      recentRecords,
      config
    })
  },

  // 未登录先引导登录
  onLoginTap() {
    wx.navigateTo({ url: '/pages/user-info/user-info' })
  },

  // 去申请（完整表单页，含规则说明与身份证选填项）
  onApplyTap() {
    if (!user.isLoggedIn()) {
      wx.showModal({
        title: '请先登录',
        content: '登录后才能申请成为分销员',
        confirmText: '去登录',
        success: r => {
          if (r.confirm) this.onLoginTap()
        }
      })
      return
    }
    wx.navigateTo({ url: '/pages/distribution-apply/distribution-apply' })
  },

  // 演示用：模拟平台审核（真实场景由后台审核）
  // 没有这个动作，申请会永远停在「审核中」，后面的佣金与提现链路就没法演示
  onDemoAuditTap() {
    const { apply } = this.data
    if (!apply) return
    // 用 actionSheet 而不是 showModal：showModal 点遮罩关闭与点取消都回调 cancel，
    // 无法区分「拒绝」和「误触关闭」
    wx.showActionSheet({
      itemList: ['模拟「审核通过」', '模拟「审核拒绝」'],
      success: res => {
        const status = res.tapIndex === 0 ? 1 : 2
        const result = distribution.auditAgent(apply.id, status)
        wx.showToast({ title: result.msg, icon: result.ok ? 'success' : 'none' })
        this.loadData()
      }
    })
  },

  // 提现
  onWithdrawTap() {
    const { agent } = this.data
    if (!agent) return
    if (agent.availableCommission < distribution.getConfig().minWithdraw) {
      wx.showToast({ title: '可提现金额不足 ' + distribution.getConfig().minWithdraw + ' 元', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/distribution-withdraw/distribution-withdraw' })
  },

  // 佣金明细
  onRecordTap() {
    wx.navigateTo({ url: '/pages/distribution-order/distribution-order' })
  },

  // 我的团队
  onTeamTap() {
    wx.navigateTo({ url: '/pages/distribution-team/distribution-team' })
  },

  onWithdrawRecordTap() {
    wx.navigateTo({ url: '/pages/distribution-withdraw/distribution-withdraw' })
  },

  // 分销规则
  onRuleTap() {
    wx.showModal({
      title: '分销规则',
      content:
        '1. 佣金比例 ' + Math.round(this.data.config.commissionRate * 100) + '%，二级佣金 ' +
        Math.round(this.data.config.secondLevelRate * 100) + '%\n' +
        '2. 通过您的推广链接下单并支付成功，佣金即时入账\n' +
        '3. 可提现佣金满 ' + this.data.config.minWithdraw + ' 元即可申请提现',
      showCancel: false
    })
  },

  onFaqTap() {
    wx.navigateTo({ url: '/pages/help/help' })
  },

  // 分享赚钱：说明推广位机制（分享路径已带 agentId）
  onShareTap() {
    const { agent } = this.data
    if (!agent) return
    wx.showActionSheet({
      itemList: ['复制推广链接', '分享给好友'],
      success: res => {
        if (res.tapIndex === 0) {
          const link = distribution.getShareLink(1001, agent.agentId)
          wx.setClipboardData({
            data: link,
            success: () => wx.showToast({ title: '推广链接已复制', icon: 'success' })
          })
        } else {
          wx.showToast({ title: '请点右上角「···」分享', icon: 'none' })
        }
      }
    })
  },

  onShareAppMessage() {
    const { agent } = this.data
    if (!agent) {
      return { title: '精选商城 · 好物推荐', path: '/pages/index/index' }
    }
    // 分享路径带 agentId，好友点进来即绑定推广位，下单支付后自动结算佣金
    return {
      title: '我在精选商城发现了超值好物，快来看看',
      path: '/pages/index/index?agentId=' + agent.agentId
    }
  }
})
