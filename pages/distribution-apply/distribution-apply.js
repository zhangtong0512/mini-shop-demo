const distribution = require('../../utils/distribution')
const user = require('../../utils/user')

Page({
  data: {
    formData: {
      name: '',
      phone: '',
      idCard: '',
      reason: ''
    },
    rules: null,
    submitting: false
  },

  onLoad() {
    const rules = distribution.getConfig()
    const u = user.getUserInfo()
    this.setData({
      rules,
      // 昵称预填姓名，减少输入
      'formData.name': (u && u.nickname) ? u.nickname : ''
    })
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['formData.' + field]: e.detail.value })
  },

  onSubmit() {
    const { formData, submitting } = this.data
    if (submitting) return

    if (!user.isLoggedIn()) {
      wx.showModal({
        title: '请先登录',
        content: '登录后才能提交分销员申请',
        confirmText: '去登录',
        success: r => {
          if (r.confirm) wx.navigateTo({ url: '/pages/user-info/user-info' })
        }
      })
      return
    }

    if (!formData.name.trim()) {
      wx.showToast({ title: '请输入真实姓名', icon: 'none' })
      return
    }
    if (!formData.phone.trim() || !/^1[3-9]\d{9}$/.test(formData.phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    setTimeout(() => {
      // 用真实登录用户 id 提交，分销中心才能查到自己的申请状态与后续佣金
      const result = distribution.applyAgent(user.getUserId(), formData.name.trim(), formData.phone.trim())
      this.setData({ submitting: false })

      if (result.ok) {
        wx.showToast({ title: result.msg, icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      } else {
        wx.showToast({ title: result.msg, icon: 'none' })
      }
    }, 500)
  }
})
