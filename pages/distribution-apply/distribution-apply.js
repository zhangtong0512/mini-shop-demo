const distribution = require('../../utils/distribution')

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
    this.setData({ rules })
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['formData.' + field]: e.detail.value })
  },

  onSubmit() {
    const { formData, submitting } = this.data
    if (submitting) return

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
      const result = distribution.applyAgent('user_current', formData.name, formData.phone)
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
