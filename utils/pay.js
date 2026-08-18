/**
 * 支付统一入口
 * 模拟模式：弹自定义「模拟支付」底部弹层（pay-sheet 组件，样式仿微信支付），确认后调用 mock.payOrder 将订单置为已支付
 * 真实模式：wx.login → 请求后端统一下单 → wx.requestPayment（系统原生支付弹层）；失败时询问是否回退到模拟支付
 *
 * 页面通过 `pay.payOrder(order, { sheet: this.selectComponent('#paySheet') })`
 * 注入自定义支付弹层；未注入时自动回退到 wx.showModal 确认框。
 */
const config = require('./config')
const mock = require('./mock')

// 从 opts 中取出页面注入的支付弹层组件实例（无则返回 null）
function getSheet(opts) {
  const sheet = opts && opts.sheet
  return sheet && typeof sheet.show === 'function' ? sheet : null
}

// 通过自定义弹层确认支付；确认后由本函数统一调用 mock.payOrder 落库
function payViaSheet(sheet, order, mode) {
  return sheet.show(order, { mode }).then(paid => {
    if (paid) mock.payOrder(order.id)
    return paid
  })
}

// 模拟支付：系统确认框兜底（页面未注入 pay-sheet 时使用）
function mockPayModal(order) {
  return new Promise(resolve => {
    wx.showModal({
      title: '模拟支付',
      content: 'Demo 环境确认支付 ¥' + order.totalPrice + ' 元？',
      confirmText: '确认支付',
      cancelText: '取消',
      success(res) {
        if (res.confirm) {
          mock.payOrder(order.id)
          resolve(true)
        } else {
          resolve(false)
        }
      },
      fail() {
        resolve(false)
      }
    })
  })
}

// 模拟支付：优先用自定义底部弹层
function mockPay(order, opts) {
  const sheet = getSheet(opts)
  if (sheet) return payViaSheet(sheet, order, 'pay')
  return mockPayModal(order)
}

// 真实支付失败时询问是否用模拟支付兜底（系统确认框兜底）
function fallbackModal(order) {
  return new Promise(resolve => {
    wx.showModal({
      title: '支付未完成',
      content: '是否改用模拟支付完成本单（¥' + order.totalPrice + ' 元）？',
      confirmText: '模拟支付',
      cancelText: '取消',
      success(res) {
        if (res.confirm) {
          mock.payOrder(order.id)
          resolve(true)
        } else {
          resolve(false)
        }
      },
      fail() {
        resolve(false)
      }
    })
  })
}

// 真实支付失败时的模拟支付兜底
function fallbackMock(order, opts) {
  const sheet = getSheet(opts)
  if (sheet) return payViaSheet(sheet, order, 'fallback')
  return fallbackModal(order)
}

// 真实微信支付流程
function realPay(order, opts) {
  return new Promise(resolve => {
    const done = paid => {
      if (paid) mock.payOrder(order.id)
      resolve(paid)
    }
    const onFail = () => fallbackMock(order, opts).then(done)

    wx.login({
      success(loginRes) {
        wx.request({
          url: config.PAY_SERVER_URL + '/api/pay/unifiedorder',
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: {
            code: loginRes.code,
            orderNo: order.orderNo,
            totalFee: Math.round(order.totalPrice * 100),
            description: (order.items || []).map(i => i.title).join(',')
          },
          success(res) {
            const d = res.data || {}
            if (res.statusCode !== 200 || d.code !== 0 || !d.data) {
              return onFail()
            }
            const p = d.data
            wx.requestPayment({
              timeStamp: p.timeStamp,
              nonceStr: p.nonceStr,
              package: p.package,
              signType: p.signType,
              paySign: p.paySign,
              success() {
                done(true)
              },
              fail() {
                onFail()
              }
            })
          },
          fail: onFail
        })
      },
      fail: onFail
    })
  })
}

// 支付入口：返回 Promise<boolean>，true 已支付 / false 取消或失败
// opts.sheet 为页面注入的自定义支付弹层（pay-sheet 组件实例）
function payOrder(order, opts) {
  if (!order || !order.id) return Promise.resolve(false)
  if (config.PAY_MODE === 'real') {
    return realPay(order, opts)
  }
  return mockPay(order, opts)
}

module.exports = {
  payOrder,
  PAY_MODE: config.PAY_MODE
}
