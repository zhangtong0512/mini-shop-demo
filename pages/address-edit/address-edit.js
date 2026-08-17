const address = require('../../utils/address')

Page({
  data: {
    id: null,
    form: {
      name: '',
      phone: '',
      region: [],
      regionText: '',
      detail: '',
      isDefault: false
    }
  },

  onLoad(options) {
    if (options.id) {
      const a = address.getAddresses().find(x => x.id === Number(options.id))
      if (a) {
        wx.setNavigationBarTitle({ title: '编辑地址' })
        this.setData({
          id: a.id,
          form: {
            name: a.name,
            phone: a.phone,
            region: a.region || [],
            regionText: a.regionText || (a.region || []).join(' '),
            detail: a.detail,
            isDefault: a.isDefault
          }
        })
      }
    }
  },

  onName(e) {
    this.setData({ 'form.name': e.detail.value })
  },

  onPhone(e) {
    this.setData({ 'form.phone': e.detail.value })
  },

  onRegion(e) {
    const v = e.detail.value
    this.setData({
      'form.region': v,
      'form.regionText': v.join(' ')
    })
  },

  onDetail(e) {
    this.setData({ 'form.detail': e.detail.value })
  },

  onDefault(e) {
    this.setData({ 'form.isDefault': e.detail.value })
  },

  onSave() {
    const f = this.data.form
    const name = (f.name || '').trim()
    const phone = (f.phone || '').trim()
    const detail = (f.detail || '').trim()

    if (!name) return wx.showToast({ title: '请填写收货人姓名', icon: 'none' })
    if (!/^1\d{10}$/.test(phone)) return wx.showToast({ title: '请填写正确的手机号', icon: 'none' })
    if (!f.regionText) return wx.showToast({ title: '请选择所在地区', icon: 'none' })
    if (!detail) return wx.showToast({ title: '请填写详细地址', icon: 'none' })

    const addr = {
      name,
      phone,
      region: f.region,
      regionText: f.regionText,
      detail,
      isDefault: f.isDefault
    }

    if (this.data.id) {
      addr.id = this.data.id
      address.updateAddress(addr)
    } else {
      address.addAddress(addr)
    }

    wx.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 600)
  }
})
