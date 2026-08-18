/**
 * 自定义支付底部弹层
 * 视觉上更接近真实微信支付弹窗：顶部标题/商户 → 居中大金额 → 微信绿确认按钮 → 取消
 *
 * 页面内用法：
 *   <pay-sheet id="paySheet" />
 *   const paid = await this.selectComponent('#paySheet').show(order, { mode: 'pay' })
 *
 * show(order, opts) 返回 Promise<boolean>，true 用户确认支付 / false 取消或点遮罩关闭
 *   opts.mode: 'pay'（默认，模拟支付确认）| 'fallback'（真实支付失败后改用模拟支付）
 * 确认后内部先进入短暂「支付中…」状态，再返回 true，交由调用方更新订单并跳转
 */
Component({
  data: {
    visible: false,
    closing: false,
    title: '微信支付',
    merchant: '',
    amountText: '0.00',
    orderNo: '',
    desc: '',
    confirmText: '确认支付',
    paying: false
  },

  methods: {
    noop() {},

    show(order, opts) {
      opts = opts || {}
      const mode = opts.mode === 'fallback' ? 'fallback' : 'pay'
      const amount = order && order.totalPrice != null ? order.totalPrice : 0
      const items = (order && order.items) || []
      this.setData({
        visible: true,
        closing: false,
        title: mode === 'fallback' ? '支付未完成' : '微信支付',
        merchant: mode === 'fallback' ? (order ? '订单 ' + order.orderNo : '') : '精选商城',
        amountText: Number(amount).toFixed(2),
        orderNo: order ? (order.orderNo || '') : '',
        desc: items.map(i => i.title).join('、').slice(0, 40),
        confirmText: mode === 'fallback' ? '改用模拟支付' : '确认支付',
        paying: false
      })
      return new Promise(resolve => {
        this._resolve = resolve
      })
    },

    onConfirm() {
      if (this.data.paying) return
      this.setData({ paying: true })
      // 短暂「支付中」等待，让模拟支付更接近真实体验
      setTimeout(() => this.finish(true), 600)
    },

    onCancel() {
      if (this.data.paying) return
      this.finish(false)
    },

    onMaskTap() {
      this.onCancel()
    },

    finish(result) {
      this.setData({ paying: false, closing: true })
      setTimeout(() => {
        this.setData({ visible: false, closing: false })
        const resolve = this._resolve
        this._resolve = null
        if (resolve) resolve(result)
      }, 220)
    }
  }
})
