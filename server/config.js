/**
 * 支付服务配置
 * 优先读取同目录 config.json，其次用环境变量 PAY_* 覆盖
 * 私钥与平台证书懒加载：缺失时不阻塞 /health（模拟模式无需证书）
 */
const fs = require('fs')
const path = require('path')

function loadConfig() {
  const file = path.join(__dirname, 'config.json')
  let fileConfig = {}
  if (fs.existsSync(file)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (e) {
      console.warn('[config] 解析 config.json 失败，已忽略：' + e.message)
    }
  }
  const env = process.env
  return {
    appid: env.PAY_APPID || fileConfig.appid || '',
    appsecret: env.PAY_APPSECRET || fileConfig.appsecret || '',
    mchid: env.PAY_MCHID || fileConfig.mchid || '',
    mchSerialNo: env.PAY_MCH_SERIAL_NO || fileConfig.mchSerialNo || '',
    apiV3Key: env.PAY_API_V3_KEY || fileConfig.apiV3Key || '',
    privateKeyPath: env.PAY_PRIVATE_KEY_PATH || fileConfig.privateKeyPath || path.join(__dirname, 'cert', 'apiclient_key.pem'),
    platformCertPath: env.PAY_PLATFORM_CERT_PATH || fileConfig.platformCertPath || path.join(__dirname, 'cert', 'wxpay_platform_cert.pem'),
    notifyUrl: env.PAY_NOTIFY_URL || fileConfig.notifyUrl || '',
    port: Number(env.PAY_PORT || fileConfig.port || 3000)
  }
}

const config = loadConfig()

function getPrivateKey() {
  return fs.readFileSync(config.privateKeyPath, 'utf8')
}

function getPlatformCert() {
  return fs.readFileSync(config.platformCertPath, 'utf8')
}

// 是否具备真实支付所需的完整配置
function isPayReady() {
  return !!(
    config.appid &&
    config.appsecret &&
    config.mchid &&
    config.mchSerialNo &&
    config.apiV3Key &&
    config.notifyUrl &&
    fs.existsSync(config.privateKeyPath)
  )
}

module.exports = Object.assign(config, { getPrivateKey, getPlatformCert, isPayReady })
