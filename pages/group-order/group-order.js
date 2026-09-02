const groupBuy = require('../../utils/group-buy')
const mock = require('../../utils/mock')
const address = require('../../utils/address')

Page({
  data: {
    goods: null,
    groupConfig: null,
    addressInfo: null,
    count: 1,
    totalPrice: 0,
    isGroup: false,
    groupId: ''
  },

  onLoad(options) {
    const { goodsId, groupId, isGroup } = options
    this.setData({
      isGroup: isGroup === 'true',
      groupId: groupId || ''
    })
    
    this.loadGoods(goodsId)
    this.loadAddress()
  },

  loadGoods(goodsId) {
    const goods = mock.getGoodsById(parseInt(goodsId))
    const config = groupBuy.GROUP_GOODS.find(c => c.goodsId === parseInt(goodsId))
    
    if (goods && config) {
      this.setData({
        goods,
        groupConfig: config,
        totalPrice: config.groupPrice
      })
    }
  },

  loadAddress() {
    const list = address.getAddressList()
    const defaultAddr = list.find(a => a.isDefault) || list[0]
    this.setData({ addressInfo: defaultAddr || null })
  },

  onSelectAddress() {
    wx.navigateTo({
      url: '/pages/address/address?select=1',
      events: {
        onSelectAddress: (addr) => {
          this.setData({ addressInfo: addr })
        }
      }
    })
  },

  onCountChange(e) {
    const type = e.currentTarget.dataset.type
    let { count, groupConfig } = this.data
    if (type === 'add') {
      count++
    } else if (type === 'minus' && count > 1) {
      count--
    }
    
    this.setData({
      count,
      totalPrice: groupConfig.groupPrice * count
    })
  },

  onSubmitOrder() {
    const { addressInfo, goods, groupConfig, count, isGroup, groupId, totalPrice } = this.data
    
    if (!addressInfo) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认下单',
      content: `${goods.title} x${count} 合计 ¥${totalPrice}`,
      success: (res) => {
        if (res.confirm) {
          // 模拟下单
          if (isGroup && groupId) {
            // 参与拼团
            const result = groupBuy.joinGroup(groupId, 'user_001', '当前用户', '')
            if (result.ok) {
              wx.showToast({ title: result.success ? '拼团成功' : '已参与拼团', icon: 'success' })
            } else {
              wx.showToast({ title: result.msg, icon: 'none' })
              return
            }
          } else {
            // 发起拼团
            const result = groupBuy.createGroup(goods.id, 'user_001', '当前用户', '')
            if (result.ok) {
              wx.showToast({ title: '拼团已创建', icon: 'success' })
            } else {
              wx.showToast({ title: result.msg, icon: 'none' })
              return
            }
          }
          
          setTimeout(() => {
            wx.redirectTo({ url: '/pages/pay-success/pay-success' })
          }, 1500)
        }
      }
    })
  }
})
