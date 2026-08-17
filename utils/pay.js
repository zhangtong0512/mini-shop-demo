/**
 * 支付统一入口
 * 模拟模式：弹「模拟支付」确认框，确认后调用 mock.payOrder 将订单置为已支付
 * 真实模式：wx.login → 请求后端统一下单 → wx.requestPayment；失败时询问是否回退到模拟支付
 */
const config = require('./config')
const mock = require('./mock')

// 模拟支付：确认框形式模拟微信支付弹窗
function mockPay(order) {
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

// 真实支付失败时询问是否用模拟支付兜底
function fallbackMock(order) {
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

// 真实微信支付流程
function realPay(order) {
  return new Promise(resolve => {
    const done = paid => {
      if (paid) mock.payOrder(order.id)
      resolve(paid)
    }
    const onFail = () => fallbackMock(order).then(done)

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
function payOrder(order) {
  if (!order || !order.id) return Promise.resolve(false)
  if (config.PAY_MODE === 'real') {
    return realPay(order)
  }
  return mockPay(order)
}

module.exports = {
  payOrder,
  PAY_MODE: config.PAY_MODE
}
