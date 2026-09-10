/**
 * 拼团订单确认页
 *
 * 拼团必须经过真实下单 + 支付：本页创建订单（按拼团价结算）→ 拉起支付 →
 * 支付成功后才是「发起拼团」或「参与拼团」，并把订单号回写到拼团上。
 * 入口：
 *   - 拼团专区/商品详情「发起拼团」→ group-order?goodsId=X&isGroup=false
 *   - 拼团详情「立即参团」        → group-order?goodsId=X&groupId=Y&isGroup=true
 */
const groupBuy = require('../../utils/group-buy')
const mock = require('../../utils/mock')
const address = require('../../utils/address')
const user = require('../../utils/user')
const pay = require('../../utils/pay')
const config = require('../../utils/config')
const distribution = require('../../utils/distribution')

Page({
  data: {
    goods: null,
    groupConfig: null,
    skuKey: '',
    skuText: '',
    addressInfo: null,
    count: 1,
    goodsAmount: 0,
    freight: 0,
    totalPrice: 0,
    isGroup: false, // true 参与他人拼团 / false 发起新拼团
    groupId: '',
    group: null,
    submitting: false
  },

  onLoad(options) {
    const goodsId = Number(options.goodsId || options.id)
    this.setData({ isGroup: options.isGroup === 'true', groupId: options.groupId || '' })

    const goods = mock.getGoodsById(goodsId)
    const groupConfig = groupBuy.GROUP_GOODS.find(c => c.goodsId === goodsId)
    if (!goods || !groupConfig) {
      wx.showToast({ title: '该商品不支持拼团', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1200)
      return
    }

    // 有规格商品默认取首个 SKU（本页不做规格选择，与详情页默认一致）
    const skuKey = (goods.skus && goods.skus.length) ? goods.skus[0].key : ''
    this.setData({
      goods,
      groupConfig,
      skuKey,
      skuText: mock.specText(goods, skuKey)
    })

    // 参与他人拼团时带上拼团信息
    if (this.data.isGroup && this.data.groupId) {
      this.setData({ group: groupBuy.getGroupById(this.data.groupId) })
    }

    this.loadAddress()
    this.calcAmount()
  },

  loadAddress() {
    const list = address.getAddressList()
    const defaultAddr = list.find(a => a.isDefault) || list[0]
    this.setData({ addressInfo: defaultAddr || null })
  },

  calcAmount() {
    const { groupConfig, count } = this.data
    if (!groupConfig) return
    const goodsAmount = groupConfig.groupPrice * count
    // 与确认订单页同一套运费规则：满额免运费，否则固定运费
    const freight = goodsAmount >= config.FREE_SHIPPING_THRESHOLD ? 0 : config.SHIPPING_FEE
    this.setData({
      goodsAmount,
      freight,
      totalPrice: goodsAmount + freight
    })
  },

  onSelectAddress() {
    wx.navigateTo({
      url: '/pages/address/address?select=1',
      events: {
        onSelectAddress: addr => {
          this.setData({ addressInfo: addr })
        }
      }
    })
  },

  onCountChange(e) {
    const type = e.currentTarget.dataset.type
    let { count } = this.data
    if (type === 'add') {
      count = Math.min(99, count + 1)
    } else if (type === 'minus' && count > 1) {
      count--
    }
    this.setData({ count })
    this.calcAmount()
  },

  onSubmitOrder() {
    const { addressInfo, goods, groupConfig, count, isGroup, groupId, submitting } = this.data
    if (submitting) return

    if (!user.isLoggedIn()) {
      wx.showModal({
        title: '请先登录',
        content: '登录后才能参与拼团',
        confirmText: '去登录',
        success: r => {
          if (r.confirm) wx.navigateTo({ url: '/pages/user-info/user-info' })
        }
      })
      return
    }

    if (!addressInfo) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }

    // 拼团次数限制（发起 / 参与都算一次）
    if (!isGroup && !groupBuy.canCreateGroup(goods.id, user.getUserId())) {
      wx.showToast({ title: '该商品已达拼团次数上限', icon: 'none' })
      return
    }

    if (isGroup) {
      const group = groupBuy.getGroupById(groupId)
      if (!group) {
        wx.showToast({ title: '拼团不存在', icon: 'none' })
        return
      }
      if (group.status !== 0) {
        wx.showToast({ title: '该拼团已结束', icon: 'none' })
        return
      }
      if (groupBuy.isGroupExpired(group)) {
        wx.showToast({ title: '该拼团已过期', icon: 'none' })
        return
      }
      if (group.currentCount >= group.requiredCount) {
        wx.showToast({ title: '该拼团人数已满', icon: 'none' })
        return
      }
      if (group.members.some(m => m.userId === user.getUserId())) {
        wx.showToast({ title: '您已参与过该拼团', icon: 'none' })
        return
      }
    }

    // 按拼团价构造订单项
    const item = mock.toOrderItem(goods, count, this.data.skuKey)
    item.price = groupConfig.groupPrice

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中' })

    setTimeout(() => {
      const order = mock.createOrder({
        items: [item],
        address: addressInfo,
        remark: isGroup ? '参与拼团' : '发起拼团',
        goodsAmount: this.data.goodsAmount,
        freight: this.data.freight,
        totalPrice: this.data.totalPrice,
        totalCount: count,
        deliveryMode: 'express',
        isGroupBuy: true,
        groupBuyId: isGroup ? groupId : '',
        groupPrice: groupConfig.groupPrice,
        // 分销推广位：拼团订单同样计入佣金
        agentId: distribution.getPendingAgent()
      })

      if (!order) {
        wx.hideLoading()
        this.setData({ submitting: false })
        wx.showToast({ title: '库存不足，请稍后再试', icon: 'none' })
        return
      }

      wx.hideLoading()
      pay.payOrder(order, { sheet: this.selectComponent('#paySheet') }).then(paid => {
        if (!paid) {
          // 未支付：订单保留为待付款，不建团（与真实拼团一致，付款才算参团成功）
          this.setData({ submitting: false })
          wx.showToast({ title: '订单已生成，付款后拼团生效', icon: 'none' })
          setTimeout(() => wx.switchTab({ url: '/pages/order/order' }), 1400)
          return
        }
        this.afterPaid(order)
      })
    }, 500)
  },

  // 支付成功后落拼团：发起 → createGroup，参与 → joinGroup（满员即成团）
  afterPaid(order) {
    const { goods, isGroup, groupId } = this.data
    const u = user.getUserInfo()
    const nickname = user.getDisplayName()
    const avatar = user.getAvatar()

    let result
    if (isGroup) {
      result = groupBuy.joinGroup(groupId, u.id, nickname, avatar)
    } else {
      result = groupBuy.createGroup(goods.id, u.id, nickname, avatar)
    }

    if (!result.ok) {
      // 订单已支付但拼团动作失败（如并发满员）：提示并退到订单列表，避免卡在本页
      wx.showModal({
        title: '拼团未生效',
        content: result.msg + '，订单已支付成功，可在订单列表查看',
        showCancel: false,
        success: () => wx.switchTab({ url: '/pages/order/order' })
      })
      return
    }

    const gid = isGroup ? groupId : result.group.id
    // 订单号回写拼团，「我的拼团」据此跳订单详情
    groupBuy.attachOrder(gid, order.orderNo)

    wx.showToast({
      title: isGroup && result.success ? '拼团成功' : (isGroup ? '已参与拼团' : '拼团已发起'),
      icon: 'success'
    })
    setTimeout(() => {
      wx.redirectTo({ url: '/pages/group-detail/group-detail?id=' + gid })
    }, 1200)
  }
})
