const address = require('../../utils/address')

Page({
  data: {
    list: [],
    mode: 'manage' // manage 管理 / select 选择（结算页跳入，点选即回传）
  },

  onLoad(options) {
    this.setData({ mode: options.mode === 'select' ? 'select' : 'manage' })
    if (this.data.mode === 'select') {
      wx.setNavigationBarTitle({ title: '选择收货地址' })
    }
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    this.setData({ list: address.getAddresses() })
  },

  // 选择模式下点击地址直接回传；管理模式下进入编辑
  onItemTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    const item = this.data.list.find(a => a.id === id)
    if (!item) return
    if (this.data.mode === 'select') {
      const ec = this.getOpenerEventChannel()
      if (ec && ec.emit) {
        ec.emit('selectAddress', { address: item })
      }
      wx.navigateBack()
      return
    }
    wx.navigateTo({ url: '/pages/address-edit/address-edit?id=' + id })
  },

  onEdit(e) {
    wx.navigateTo({ url: '/pages/address-edit/address-edit?id=' + Number(e.currentTarget.dataset.id) })
  },

  onSetDefault(e) {
    address.setDefault(Number(e.currentTarget.dataset.id))
    this.refresh()
  },

  onDelete(e) {
    const id = Number(e.currentTarget.dataset.id)
    wx.showModal({
      title: '提示',
      content: '确定要删除该地址吗？',
      success: res => {
        if (res.confirm) {
          address.removeAddress(id)
          this.refresh()
        }
      }
    })
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' })
  },

  // 阻止操作区点击冒泡到整卡点击
  noop() {}
})
