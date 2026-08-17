# 精选商城 · 微信小程序 Demo

一个**原生微信小程序**实现的电商购物 Demo，无后端依赖，商品、地址与订单数据通过本地 `storage` 模拟。

## 功能

- **首页**：搜索、轮播 Banner、分类筛选、商品瀑布流
- **商品详情**：顶部轮播大图（自动播放、页码角标、点击全屏预览）、价格、销量库存、数量选择、加入购物车 / 立即购买，下拉浏览图文详情（详细介绍 + 详情大图，点击可预览）
- **购物车**：勾选、数量加减、删除、全选、合计结算、tabBar 角标同步
- **确认订单**：收货地址选择（可新增/编辑）、商品清单、金额明细（商品金额/运费/应付）、订单备注、库存校验、提交订单
- **收货地址**：地址列表、新增/编辑/删除、设默认；结算页点选回传
- **支付**：下单后拉起微信支付（真实 v3 接入 + 模拟回退，默认模拟模式可直接演示），支付成功进入**支付成功页**
- **订单中心**：全部 / 待付款 / 待发货 / 待收货 / 已完成 / 已取消 切换，卡片进详情，待付款倒计时，去支付、取消订单、确认收货
- **订单详情**：状态与倒计时、收货地址、商品清单、金额明细、订单信息（订单号/下单/支付/发货时间）、去支付 / 取消 / 模拟发货 / 确认收货 / 删除 / 再次购买
- **我的**：个人中心、订单快捷入口、收货地址入口、常用菜单

## 下单支付流程

```
购物车结算 / 商品立即购买
        ↓
确认订单页（选地址 → 金额明细 → 备注 → 提交）
        ↓
创建订单（校验库存，待付款 30 分钟超时自动取消）
        ↓
模拟支付 / 微信支付
        ↓
支付成功页 → 订单详情 → 订单中心
```

- 支付成功时才**扣减商品库存**；取消待付款订单不会回补（未扣），已扣库存的订单取消时自动回补
- 待付款订单展示倒计时，超时自动取消并归入「已取消」
- 订单详情「待发货」状态提供**模拟发货**按钮（Demo 用，替代真实商家的发货动作），方便演示完整链路

## 运行方式

1. 安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（稳定版即可）
2. 打开开发者工具 → **导入项目** → 选择本目录 `D:\ClaudeProject\mini-shop-demo`
3. AppID 选择「测试号」（或填写你自己的 AppID）
4. 商品图片使用网络占位图，若加载不出，在「详情 → 本地设置」勾选 **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**（本工程已在 `project.config.json` 中预置 `urlCheck: false`，通常无需手动勾选）

## 目录结构

```
mini-shop-demo/
├── app.js / app.json / app.wxss     # 全局入口、页面与 tabBar 配置、全局样式
├── project.config.json              # 开发者工具项目配置
├── sitemap.json
├── utils/
│   ├── mock.js                      # 商品/分类/订单 mock 数据与操作（含库存、超时取消）
│   ├── cart.js                      # 购物车本地存储与 tabBar 角标
│   ├── address.js                   # 收货地址本地存储与操作
│   ├── pay.js                       # 支付入口（模拟支付 / 真实微信支付）
│   └── config.js                    # 支付模式、运费规则、支付超时配置
├── server/                          # 微信支付 v3 示例后端（零依赖 Node.js）
│   ├── index.js                     # HTTP 服务（统一下单 / 支付回调 / 健康检查）
│   ├── wechat.js                    # v3 签名、JSAPI 下单、回调验签解密
│   ├── config.js                    # 后端配置读取
│   └── config.example.json          # 后端配置示例（复制为 config.json 使用）
├── components/
│   └── goods-card/                  # 商品卡片组件（首页复用）
└── pages/
    ├── index/                       # 首页
    ├── detail/                      # 商品详情
    ├── cart/                        # 购物车
    ├── checkout/                    # 确认订单
    ├── address/                     # 收货地址列表（管理 / 选择）
    ├── address-edit/                # 收货地址新增 / 编辑
    ├── pay-success/                 # 支付成功
    ├── order-detail/                # 订单详情
    ├── order/                       # 订单中心
    └── mine/                        # 我的
```

## 数据说明

- 商品、分类、Banner 定义在 `utils/mock.js`，可自由增改
- 购物车存于 storage key `cartList`，收货地址存于 `addressList`，订单存于 `orderList`
- 商品图片使用 `picsum.photos` 占位图，加载失败时自动显示 emoji 占位块，无需本地图片资源
- 首次启动会预置 1 条默认收货地址与 2 条示例订单，便于直接演示

## 支付说明

支付默认使用**模拟模式**（`utils/config.js` 中 `PAY_MODE: 'mock'`）：下单后弹出「模拟支付」确认框，点确认即完成支付，无需后端和商户号，开发者工具里可直接演示完整流程。订单中心「待付款」订单点「去支付」同样走支付流程。

### 切换真实微信支付

真实支付采用微信支付 **v3 JSAPI**，需要商户号与自建后端（本工程已内置零依赖 Node 后端，见 `server/`）：

1. 配置后端：复制 `server/config.example.json` 为 `server/config.json`，填入：
   - `appid` / `appsecret`：小程序的 AppID 与 AppSecret（`appsecret` 用于 code 换 openid）
   - `mchid` / `mchSerialNo`：微信支付商户号、商户 API 证书序列号
   - `apiV3Key`：API v3 密钥（32 位）
   - `privateKeyPath` / `platformCertPath`：商户私钥与微信支付平台证书路径
   - `notifyUrl`：**公网 HTTPS** 的回调地址（如 `https://你的域名/api/pay/notify`）
2. 启动后端：`cd server && npm start`（零依赖，无需 `npm install`），或直接 `node server/index.js`
3. 前端切换：`utils/config.js` 中 `PAY_MODE` 改为 `'real'`，`PAY_SERVER_URL` 指向后端地址
4. 重新导入/预览小程序：下单后走 `wx.login → 统一下单 → wx.requestPayment`；真实支付失败时会弹窗询问是否改用模拟支付兜底

### 注意事项

- **测试号 / 开发者工具无法完成真实 `wx.requestPayment`**（微信支付能力未开通），真实支付需在正式小程序 + 已开通微信支付的商户号下于真机测试
- 开发者工具中 `urlCheck: false` 已预置，可访问 `http://127.0.0.1:3000` 本地后端；真机需把后端地址换成 **HTTPS 域名**，并在小程序后台「开发 → 开发管理 → 服务器域名」配置 request 合法域名
- 生产环境应在 `server/index.js` 的 `/api/pay/notify` 中按 `out_trade_no` 更新订单状态并做幂等处理（当前仅打印日志）
