/**
 * 全局配置
 * PAY_MODE:
 *   'mock'  模拟支付（默认）：开发者工具里弹自定义「模拟支付」底部弹层（样式仿微信支付），无需后端与商户号
 *   'real'  真实微信支付：需先启动 server/ 后端并配置商户号，失败时会回退到模拟支付
 * PAY_SERVER_URL: 真实模式下后端地址
 * 运费规则：商品金额满 FREE_SHIPPING_THRESHOLD 免运费，否则收取 SHIPPING_FEE
 * PAY_TIMEOUT_MINUTES: 待付款订单超时自动取消的分钟数
 */
module.exports = {
  PAY_MODE: 'mock',
  PAY_SERVER_URL: 'http://127.0.0.1:3000',

  SHIPPING_FEE: 12,
  FREE_SHIPPING_THRESHOLD: 99,
  PAY_TIMEOUT_MINUTES: 30
}
