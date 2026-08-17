/**
 * 微信支付示例后端（零依赖）
 * 启动：node index.js  （或 npm start）
 *
 * 路由：
 *   GET  /health                  健康检查
 *   POST /api/pay/unifiedorder    统一下单（JSAPI），返回小程序支付参数
 *   POST /api/pay/notify          支付结果回调（验签 + 解密）
 */
const http = require('http')
const config = require('./config')
const wechat = require('./wechat')

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const pathname = url.pathname

  if (req.method === 'GET' && pathname === '/health') {
    return sendJson(res, 200, { ok: true, payReady: config.isPayReady() })
  }

  if (req.method === 'POST' && pathname === '/api/pay/unifiedorder') {
    return readBody(req)
      .then(raw => {
        const body = JSON.parse(raw || '{}')
        const { code, orderNo, totalFee, description } = body
        if (!code || !orderNo) throw new Error('缺少 code 或 orderNo')
        const total = Number(totalFee)
        if (!Number.isInteger(total) || total <= 0 || total > 10000000) {
          throw new Error('totalFee 非法（需为正整数分，且 ≤10000000）')
        }
        if (!config.isPayReady()) {
          throw new Error('支付配置不完整，请参照 server/config.example.json 配置 config.json')
        }
        return wechat
          .code2session(code)
          .then(openid => {
            return wechat.createJsapiOrder({
              openid,
              outTradeNo: orderNo,
              description: String(description || '精选商城订单').slice(0, 127),
              total
            })
          })
          .then(prepayId => {
            sendJson(res, 200, { code: 0, data: wechat.buildPaymentParams(prepayId) })
          })
      })
      .catch(err => {
        console.error('[unifiedorder] 失败：', err.message)
        sendJson(res, 500, { code: -1, message: err.message })
      })
  }

  if (req.method === 'POST' && pathname === '/api/pay/notify') {
    return readBody(req)
      .then(raw => {
        if (!wechat.verifyNotify(req.headers, raw)) {
          return sendJson(res, 401, { code: 'FAIL', message: '签名验证失败' })
        }
        const body = JSON.parse(raw)
        const tx = wechat.decryptResource(body.resource)
        // 生产环境在这里按 tx.out_trade_no 更新订单状态并做幂等处理
        console.log('[notify] 支付成功 out_trade_no=%s transaction_id=%s', tx.out_trade_no, tx.transaction_id)
        sendJson(res, 200, { code: 'SUCCESS', message: '成功' })
      })
      .catch(err => {
        console.error('[notify] 处理失败：', err.message)
        sendJson(res, 400, { code: 'FAIL', message: '失败' })
      })
  }

  sendJson(res, 404, { code: -1, message: 'not found' })
})

server.listen(config.port, () => {
  console.log('支付服务已启动: http://127.0.0.1:' + config.port)
  console.log('真实支付配置就绪：', config.isPayReady() ? '是' : '否（需配置 server/config.json）')
})
