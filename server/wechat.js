/**
 * 微信支付 v3 核心封装（零依赖）
 * 仅使用 node:https / node:crypto / node:fs
 *
 * 流程：code2session(openid) → JSAPI 下单(prepay_id) → buildPaymentParams(paySign)
 * 回调：verifyNotify(验签) → decryptResource(AES-256-GCM 解密)
 */
const crypto = require('crypto')
const https = require('https')
const config = require('./config')

function rsaSign(message, privateKey) {
  return crypto.createSign('RSA-SHA256').update(message, 'utf8').sign(privateKey, 'base64')
}

function randomNonce(len) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len)
}

// 通用 HTTPS 请求，返回解析后的 JSON（非 2xx 抛错）
function httpsJson(method, host, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({ host, path, method, headers }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        let data = raw
        try {
          data = JSON.parse(raw)
        } catch (e) {
          /* 保留原文 */
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          return resolve(data)
        }
        reject(new Error('HTTP ' + res.statusCode + ' ' + raw))
      })
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

// 对微信支付 v3 接口发起带签名的请求
// 签名串：method\ncanonicalUrl\nqueryString\nbody\n
function wechatPayRequest(method, urlPath, bodyObj) {
  const body = JSON.stringify(bodyObj || {})
  const timestamp = String(Math.floor(Date.now() / 1000))
  const nonceStr = randomNonce(32)
  const message = method + '\n' + urlPath + '\n\n' + body + '\n'
  const signature = rsaSign(message, config.getPrivateKey())
  const auth =
    'WECHATPAY2-SHA256-RSA2048 mchid="' + config.mchid + '"' +
    ',nonce_str="' + nonceStr + '"' +
    ',signature="' + signature + '"' +
    ',timestamp="' + timestamp + '"' +
    ',serial_no="' + config.mchSerialNo + '"'
  return httpsJson(method, 'api.mch.weixin.qq.com', urlPath, {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: auth,
    'User-Agent': 'mini-shop-pay-demo'
  }, body)
}

// wx.login 的 code 换取 openid（普通微信接口，使用小程序 appsecret，不签名）
async function code2session(code) {
  const qs =
    'appid=' + encodeURIComponent(config.appid) +
    '&secret=' + encodeURIComponent(config.appsecret) +
    '&js_code=' + encodeURIComponent(code) +
    '&grant_type=authorization_code'
  const data = await httpsJson('GET', 'api.weixin.qq.com', '/sns/jscode2session?' + qs, {})
  if (data.errcode) {
    const err = new Error('code2session 失败: ' + (data.errmsg || data.errcode))
    err.errcode = data.errcode
    throw err
  }
  return data.openid
}

// JSAPI 下单，返回 prepay_id
async function createJsapiOrder({ openid, outTradeNo, description, total }) {
  const res = await wechatPayRequest('POST', '/v3/pay/transactions/jsapi', {
    appid: config.appid,
    mchid: config.mchid,
    description: description,
    out_trade_no: outTradeNo,
    notify_url: config.notifyUrl,
    amount: { total: total, currency: 'CNY' },
    payer: { openid: openid }
  })
  return res.prepay_id
}

// 构建 wx.requestPayment 所需参数（paySign 用商户私钥签名）
// 签名串：appId\ntimeStamp\nnonceStr\npackage\n
function buildPaymentParams(prepayId) {
  const timeStamp = String(Math.floor(Date.now() / 1000))
  const nonceStr = randomNonce(32)
  const pkg = 'prepay_id=' + prepayId
  const message = config.appid + '\n' + timeStamp + '\n' + nonceStr + '\n' + pkg + '\n'
  return {
    timeStamp: timeStamp,
    nonceStr: nonceStr,
    package: pkg,
    signType: 'RSA',
    paySign: rsaSign(message, config.getPrivateKey())
  }
}

// 校验支付回调签名（使用微信支付平台证书公钥）
// 签名串：timestamp\nnonce\nbody\n
function verifyNotify(headers, rawBody) {
  const ts = headers['wechatpay-timestamp']
  const nonce = headers['wechatpay-nonce']
  const sig = headers['wechatpay-signature']
  if (!ts || !nonce || !sig) return false
  // 时间戳防重放：与当前时间差超过 5 分钟视为无效
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false
  const message = ts + '\n' + nonce + '\n' + rawBody + '\n'
  const verifier = crypto.createVerify('RSA-SHA256')
  verifier.update(message, 'utf8')
  return verifier.verify(config.getPlatformCert(), sig, 'base64')
}

// AES-256-GCM 解密回调 resource（密文末 16 字节为 auth tag）
function decryptResource({ associated_data, nonce, ciphertext }) {
  const buf = Buffer.from(ciphertext, 'base64')
  const tag = buf.subarray(buf.length - 16)
  const data = buf.subarray(0, buf.length - 16)
  const decipher = crypto.createDecipheriv('aes-256-gcm', config.apiV3Key, Buffer.from(nonce, 'base64'))
  decipher.setAuthTag(tag)
  if (associated_data) decipher.setAAD(Buffer.from(associated_data, 'utf8'))
  return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8'))
}

module.exports = {
  rsaSign,
  code2session,
  createJsapiOrder,
  buildPaymentParams,
  verifyNotify,
  decryptResource
}
