const user = require('../../utils/user')

Page({
  data: {
    // login = 未登录采集资料；edit = 已登录查看/修改 + 退出登录
    mode: 'login',
    form: {
      avatar: '',
      nickname: ''
    }
  },

  onLoad() {
    const u = user.getUserInfo()
    if (u) {
      wx.setNavigationBarTitle({ title: '个人资料' })
      this.setData({
        mode: 'edit',
        form: {
          avatar: u.avatar || '',
          nickname: u.nickname || ''
        }
      })
    }
  },

  onChooseAvatar(e) {
    this.setData({ 'form.avatar': e.detail.avatarUrl })
  },

  // 昵称输入：同时绑定 bindinput 与 bindchange（微信昵称快捷填充触发的是 change）
  onNickname(e) {
    this.setData({ 'form.nickname': e.detail.value })
  },

  onLogin() {
    const nickname = (this.data.form.nickname || '').trim()
    if (!nickname) {
      return wx.showToast({ title: '请填写昵称', icon: 'none' })
    }
    // 编辑时保留原 id / 登录时间；新登录生成
    const u = user.getUserInfo() || {}
    user.saveUserInfo({
      avatar: this.data.form.avatar,
      nickname,
      id: u.id || 'ID:' + Date.now(),
      loginTime: u.loginTime || Date.now()
    })
    wx.showToast({ title: this.data.mode === 'edit' ? '保存成功' : '登录成功', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 600)
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录？',
      success: res => {
        if (res.confirm) {
          user.logout()
          this.setData({ mode: 'login', form: { avatar: '', nickname: '' } })
          wx.showToast({ title: '已退出登录', icon: 'none' })
          setTimeout(() => wx.navigateBack(), 600)
        }
      }
    })
  }
})
