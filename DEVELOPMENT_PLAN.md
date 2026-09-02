# 精选商城 · 8大新功能模块开发计划

## 开发顺序与依赖关系

```
第一阶段（基础能力）
├── 1. 会员等级体系 ← 基础模块，其他功能依赖
├── 2. 消息通知系统 ← 基础能力，订单/拼团/分销都需要
└── 3. 多门店系统 ← 商品数据扩展

第二阶段（营销功能）
├── 4. 拼团功能 ← 依赖会员体系
├── 5. 分销功能 ← 依赖会员体系
└── 6. 商品对比 ← 相对独立

第三阶段（高级功能）
├── 7. 直播功能 ← 依赖门店数据
└── 8. AR试穿/试用 ← 技术复杂度高
```

---

## 一、会员等级体系

### 1.1 功能概述
- 会员等级：普通会员 → 银卡 → 金卡 → 钻石会员
- 成长值体系：消费1元=1成长值，签到+5，评价+10
- 等级权益：折扣优惠、专属优惠券、免运费、优先发货

### 1.2 数据模型

```javascript
// utils/member.js - 会员数据存储
{
  userId: 'ID:xxx',
  level: 1,                    // 1普通 2银卡 3金卡 4钻石
  growth: 0,                   // 成长值
  totalConsumed: 0,            // 累计消费金额
  memberNo: 'VIP20260815001',  // 会员编号
  joinTime: 1755436800000,     // 入会时间
  
  // 等级配置
  levels: [
    { level: 1, name: '普通会员', minGrowth: 0, discount: 1, icon: '👤' },
    { level: 2, name: '银卡会员', minGrowth: 500, discount: 0.98, icon: '🥈' },
    { level: 3, name: '金卡会员', minGrowth: 2000, discount: 0.95, icon: '🥇' },
    { level: 4, name: '钻石会员', minGrowth: 5000, discount: 0.92, icon: '💎' }
  ],
  
  // 权益配置
  benefits: {
    2: { freeShipping: false, couponMonthly: 5, priorityShip: false },
    3: { freeShipping: true, couponMonthly: 10, priorityShip: false },
    4: { freeShipping: true, couponMonthly: 20, priorityShip: true }
  }
}
```

### 1.3 页面设计

**新页面：**
- `pages/member/member` - 会员中心（等级展示、成长值进度、权益列表、积分明细）
- `pages/member-level/member-level` - 等级说明（各等级权益对比）

**修改页面：**
- `pages/mine/mine` - 显示会员等级徽章
- `pages/checkout/checkout` - 会员折扣计算

### 1.4 核心API

```javascript
// utils/member.js
module.exports = {
  getMemberInfo(),           // 获取会员信息
  addGrowth(points, desc),   // 增加成长值
  getLevelDiscount(level),   // 获取等级折扣
  getLevelBenefits(level),   // 获取等级权益
  checkLevelUp(),            // 检查升级
  getGrowthHistory()         // 成长值明细
}
```

---

## 二、消息通知系统

### 2.1 功能概述
- 订单状态变更通知（待付款提醒、发货通知、签收提醒）
- 拼团进度通知（拼团成功/失败）
- 分销佣金到账通知
- 系统公告、促销活动推送
- 消息中心（历史消息列表）

### 2.2 数据模型

```javascript
// utils/notification.js
{
  notifications: [
    {
      id: 1755436800000,
      type: 'order',           // order/system/promotion/group/distribution
      title: '订单发货通知',
      content: '您的订单D20260815...已发货',
      orderId: 10001,
      isRead: false,
      createTime: '2026-08-15 18:30:00',
      icon: '📦'
    }
  ],
  unreadCount: 0,
  settings: {
    orderNotify: true,
    systemNotify: true,
    promotionNotify: true
  }
}
```

### 2.3 页面设计

**新页面：**
- `pages/notification/notification` - 消息中心（消息列表、未读标记、消息详情）
- `pages/notification-setting/notification-setting` - 通知设置

### 2.4 核心API

```javascript
// utils/notification.js
module.exports = {
  addNotification(type, title, content, extra),  // 添加通知
  getNotifications(type),                         // 获取通知列表
  markAsRead(id),                                 // 标记已读
  markAllRead(),                                  // 全部已读
  getUnreadCount(),                               // 获取未读数
  deleteNotification(id),                         // 删除通知
  updateSettings(settings)                        // 更新设置
}
```

---

## 三、多门店系统

### 3.1 功能概述
- 门店列表展示（按距离排序）
- 门店详情（营业时间、地址、电话）
- 门店商品库存查询
- 门店自提选项
- 按地理位置推荐最近门店

### 3.2 数据模型

```javascript
// utils/store.js
{
  stores: [
    {
      id: 1,
      name: '精选商城·上海旗舰店',
      address: '上海市浦东新区世纪大道100号',
      phone: '021-58888888',
      businessHours: '09:00-22:00',
      location: { latitude: 31.2304, longitude: 121.4737 },
      distance: 0,            // 计算得出
      images: ['url1', 'url2'],
      services: ['自提', '退换货', '体验'],
      status: 1               // 1营业 0休息
    }
  ],
  currentStore: null,          // 当前选择门店
  userLocation: null           // 用户位置
}
```

### 3.3 页面设计

**新页面：**
- `pages/store/store` - 门店列表（地图+列表）
- `pages/store-detail/store-detail` - 门店详情
- `pages/store-select/store-select` - 门店选择（结算页跳入）

### 3.4 核心API

```javascript
// utils/store.js
module.exports = {
  getStores(),                    // 获取门店列表
  getStoreById(id),               // 获取门店详情
  setCurrentStore(store),         // 设置当前门店
  getCurrentStore(),              // 获取当前门店
  calculateDistance(lat1, lng1, lat2, lng2),  // 计算距离
  sortByDistance(stores)          // 按距离排序
}
```

---

## 四、拼团功能

### 4.1 功能概述
- 拼团商品展示（拼团价、原价、已拼团数）
- 发起拼团（分享给好友）
- 参与拼团（从分享链接进入）
- 拼团倒计时（24小时内未成团自动退款）
- 拼团成功/失败通知

### 4.2 数据模型

```javascript
// utils/group-buy.js
{
  // 拼团商品配置
  groupGoods: [
    {
      goodsId: 1001,
      groupPrice: 3599,       // 拼团价
      originalPrice: 3999,    // 原价
      groupSize: 2,           // 拼团人数
      groupCount: 128,        // 已拼团数
      limitPerUser: 1,        // 每人限购
      groupEndTime: 1755523200000  // 活动结束时间
    }
  ],
  
  // 拼团订单
  groups: [
    {
      id: 'G20260815001',
      goodsId: 1001,
      groupPrice: 3599,
      status: 0,              // 0拼团中 1已成功 2已失败
      ownerId: 'user1',       // 发起人
      members: [
        { userId: 'user1', nickname: '张三', avatar: 'url', joinTime: '...' }
      ],
      requiredCount: 2,       // 需要人数
      currentCount: 1,        // 当前人数
      createTime: '2026-08-15 10:00:00',
      expireTime: '2026-08-16 10:00:00',  // 24小时后
      orderNo: 'D20260815...'
    }
  ]
}
```

### 4.3 页面设计

**新页面：**
- `pages/group-buy/group-buy` - 拼团专区（拼团商品列表）
- `pages/group-detail/group-detail` - 拼团详情（进度、成员、倒计时）
- `pages/group-order/group-order` - 拼团订单确认

**修改页面：**
- `pages/detail/detail` - 商品详情增加拼团入口
- `pages/index/index` - 首页增加拼团专区入口

### 4.4 核心API

```javascript
// utils/group-buy.js
module.exports = {
  getGroupGoods(),                     // 获取拼团商品
  getGroupById(groupId),               // 获取拼团详情
  createGroup(goodsId, skuKey, count), // 发起拼团
  joinGroup(groupId),                  // 参与拼团
  checkGroupStatus(groupId),           // 检查拼团状态
  getMyGroups(),                       // 我的拼团
  cancelGroup(groupId)                 // 取消拼团
}
```

---

## 五、分销功能

### 5.1 功能概述
- 分销员申请与审核
- 分享商品赚佣金（一级分销）
- 分销订单管理
- 佣金明细与提现
- 分销团队（查看下级）

### 5.2 数据模型

```javascript
// utils/distribution.js
{
  // 分销员信息
  distributor: {
    userId: 'ID:xxx',
    level: 1,                    // 1普通分销员 2高级分销员
    status: 'approved',          // pending/approved/rejected
    commissionRate: 0.1,         // 佣金比例10%
    totalCommission: 0,          // 累计佣金
    availableCommission: 0,      // 可提现佣金
    teamCount: 0,                // 团队人数
    applyTime: 1755436800000,
    approveTime: 1755436800000
  },
  
  // 分销商品配置
  distributeGoods: [
    {
      goodsId: 1001,
      commissionRate: 0.1,      // 佣金比例
      commission: 399.9,        // 预估佣金（计算得出）
      isDistribute: true        // 是否参与分销
    }
  ],
  
  // 分销订单
  distributeOrders: [
    {
      id: 1755436800000,
      orderNo: 'D20260815...',
      goodsTitle: '星野 X10 智能手机',
      orderAmount: 3999,
      commission: 399.9,
      status: 0,                // 0待结算 1已结算 2已失效
      buyerNickname: '李四',
      buyerId: 'user2',
      createTime: '2026-08-15 10:00:00',
      settleTime: ''
    }
  ],
  
  // 佣金明细
  commissionLedger: [
    {
      id: 1755436800000,
      type: 'order',            // order/withdraw/settle
      amount: 399.9,
      desc: '订单D20260815...佣金',
      createTime: '2026-08-15 10:00:00'
    }
  ],
  
  // 下级团队
  team: [
    {
      userId: 'user2',
      nickname: '李四',
      avatar: 'url',
      joinTime: '2026-08-15',
      orderCount: 5,
      totalAmount: 15000
    }
  ]
}
```

### 5.3 页面设计

**新页面：**
- `pages/distribution/distribution` - 分销中心（佣金概览、团队、订单）
- `pages/distribution-apply/distribution-apply` - 分销员申请
- `pages/distribution-order/distribution-order` - 分销订单列表
- `pages/distribution-team/distribution-team` - 我的团队
- `pages/distribution-withdraw/distribution-withdraw` - 佣金提现

**修改页面：**
- `pages/mine/mine` - 增加入口
- `pages/detail/detail` - 分享按钮（带分销码）

### 5.4 核心API

```javascript
// utils/distribution.js
module.exports = {
  applyDistributor(form),           // 申请成为分销员
  getDistributorInfo(),             // 获取分销员信息
  getShareCode(goodsId),            // 生成分销分享码
  parseShareCode(code),             // 解析分享码
  getDistributeOrders(status),      // 获取分销订单
  getCommissionSummary(),           // 佣金汇总
  withdrawCommission(amount),       // 提现佣金
  getTeamMembers(),                 // 获取团队成员
  calculateCommission(orderAmount), // 计算佣金
  settleCommission(orderNo)         // 结算佣金
}
```

---

## 六、商品对比功能

### 6.1 功能概述
- 选择2-4个商品进行对比
- 参数对比（价格、规格、销量等）
- 差异高亮显示
- 对比列表管理

### 6.2 数据模型

```javascript
// utils/compare.js
{
  compareList: [],    // 对比商品ID数组（最多4个）
  compareFields: [    // 对比字段配置
    { key: 'price', name: '价格', type: 'price' },
    { key: 'originalPrice', name: '原价', type: 'price' },
    { key: 'sales', name: '销量', type: 'number' },
    { key: 'stock', name: '库存', type: 'number' },
    { key: 'category', name: '分类', type: 'text' },
    { key: 'specs', name: '规格', type: 'spec' }
  ]
}
```

### 6.3 页面设计

**新页面：**
- `pages/compare/compare` - 商品对比页（表格对比、差异高亮）

**修改页面：**
- `pages/detail/detail` - 增加"加入对比"按钮
- `pages/index/index` / `pages/search/search` - 商品卡片增加对比勾选

### 6.4 核心API

```javascript
// utils/compare.js
module.exports = {
  addToCompare(goodsId),        // 加入对比
  removeFromCompare(goodsId),   // 移除对比
  clearCompare(),               // 清空对比
  getCompareList(),             // 获取对比列表
  getCompareGoods(),            // 获取对比商品详情
  isInCompare(goodsId),         // 是否已在对比中
  getCompareCount()             // 获取对比数量
}
```

---

## 七、直播功能

### 7.1 功能概述
- 直播预告列表
- 直播中入口（跳转微信小程序直播组件）
- 直播间商品推荐
- 直播回放

### 7.2 数据模型

```javascript
// utils/live.js
{
  // 直播配置
  liveRooms: [
    {
      roomId: 1001,
      title: '星野X10新品首发直播',
      cover: 'url',
      status: 0,              // 0预告 1直播中 2已结束
      startTime: '2026-08-20 20:00:00',
      endTime: '',
      anchorName: '官方主播',
      anchorAvatar: 'url',
      goodsIds: [1001, 1002],  // 直播间推荐商品
      viewerCount: 0,
      likeCount: 0
    }
  ]
}
```

### 7.3 页面设计

**新页面：**
- `pages/live/live` - 直播中心（预告、直播中、回放）
- `pages/live-detail/live-detail` - 直播详情（使用微信live-player组件）

**修改页面：**
- `pages/index/index` - 首页增加直播入口（直播中状态闪烁）
- `pages/detail/detail` - 商品详情关联直播

### 7.4 核心API

```javascript
// utils/live.js
module.exports = {
  getLiveRooms(status),           // 获取直播列表
  getLiveRoomById(roomId),        // 获取直播详情
  getLiveGoods(roomId),           // 获取直播间商品
  updateViewerCount(roomId),      // 更新观看人数
  isLiveRoomLive(roomId)          // 是否直播中
}
```

**注意：** 真实直播功能需要：
1. 微信小程序直播插件（需在小程序后台开通）
2. 直播间ID（从微信直播后台获取）
3. 使用 `<live-pusher>` 和 `<live-player>` 组件

---

## 八、AR试穿/试用

### 8.1 功能概述
- 支持AR试穿的商品标记
- 调用手机摄像头进行AR预览
- 商品模型展示
- 截图分享

### 8.2 数据模型

```javascript
// utils/ar.js
{
  // AR商品配置
  arGoods: [
    {
      goodsId: 1004,           // 卫衣
      type: 'wear',            // wear(试穿)/use(试用)
      modelUrl: 'url',         // 3D模型地址
      posterUrl: 'url',        // 模特图片
      hotspots: [              // 热点区域
        { x: 0.5, y: 0.3, label: '领口' }
      ]
    }
  ]
}
```

### 8.3 页面设计

**新页面：**
- `pages/ar-preview/ar-preview` - AR预览页（摄像头+模型叠加）

**修改页面：**
- `pages/detail/detail` - 支持AR的商品增加"AR试穿"按钮

### 8.4 核心API

```javascript
// utils/ar.js
module.exports = {
  getArConfig(goodsId),        // 获取AR配置
  isArSupported(),             // 是否支持AR
  captureScreenshot()          // 截图保存
}
```

**注意：** AR功能实现方案：
1. **简单方案**：使用微信小程序 `camera` 组件 + Canvas 叠加商品图片
2. **进阶方案**：接入第三方AR SDK（如Wikitude、Vuforia）
3. **原生方案**：使用微信 `AR` 能力（需微信基础库 2.19.0+）

---

## 九、技术实现要点

### 9.1 文件结构规划

```
mini-shop-demo/
├── utils/
│   ├── member.js           # 新增：会员等级
│   ├── notification.js     # 新增：消息通知
│   ├── store.js            # 新增：多门店
│   ├── group-buy.js        # 新增：拼团
│   ├── distribution.js     # 新增：分销
│   ├── compare.js          # 新增：商品对比
│   ├── live.js             # 新增：直播
│   └── ar.js               # 新增：AR试穿
│
├── components/
│   ├── member-badge/       # 新增：会员等级徽章组件
│   ├── notification-dot/   # 新增：消息未读角标组件
│   ├── store-card/         # 新增：门店卡片组件
│   ├── group-card/         # 新增：拼团卡片组件
│   ├── compare-bar/        # 新增：对比悬浮栏组件
│   └── live-entry/         # 新增：直播入口组件
│
├── pages/
│   ├── member/             # 新增：会员中心
│   ├── member-level/       # 新增：等级说明
│   ├── notification/       # 新增：消息中心
│   ├── store/              # 新增：门店列表
│   ├── store-detail/       # 新增：门店详情
│   ├── store-select/       # 新增：门店选择
│   ├── group-buy/          # 新增：拼团专区
│   ├── group-detail/       # 新增：拼团详情
│   ├── distribution/       # 新增：分销中心
│   ├── distribution-apply/ # 新增：分销申请
│   ├── distribution-order/ # 新增：分销订单
│   ├── distribution-team/  # 新增：我的团队
│   ├── distribution-withdraw/ # 新增：佣金提现
│   ├── compare/            # 新增：商品对比
│   ├── live/               # 新增：直播中心
│   ├── live-detail/        # 新增：直播详情
│   └── ar-preview/         # 新增：AR预览
```

### 9.2 app.json 更新

```json
{
  "pages": [
    // ... 现有22个页面
    "pages/member/member",
    "pages/member-level/member-level",
    "pages/notification/notification",
    "pages/store/store",
    "pages/store-detail/store-detail",
    "pages/store-select/store-select",
    "pages/group-buy/group-buy",
    "pages/group-detail/group-detail",
    "pages/distribution/distribution",
    "pages/distribution-apply/distribution-apply",
    "pages/distribution-order/distribution-order",
    "pages/distribution-team/distribution-team",
    "pages/distribution-withdraw/distribution-withdraw",
    "pages/compare/compare",
    "pages/live/live",
    "pages/live-detail/live-detail",
    "pages/ar-preview/ar-preview"
  ],
  "plugins": {
    // 微信直播插件（如需真实直播）
    "live-player-plugin": {
      "version": "1.0.0",
      "provider": "wx2f6bde0035db7d5"
    }
  }
}
```

### 9.3 开发工作量估算

| 功能模块 | 页面数 | 组件数 | utils模块 | 工作量 |
|---------|-------|-------|----------|-------|
| 会员等级 | 2 | 1 | 1 | 2天 |
| 消息通知 | 2 | 1 | 1 | 2天 |
| 多门店 | 3 | 1 | 1 | 3天 |
| 拼团功能 | 3 | 1 | 1 | 4天 |
| 分销功能 | 5 | 0 | 1 | 5天 |
| 商品对比 | 1 | 1 | 1 | 2天 |
| 直播功能 | 2 | 1 | 1 | 3天 |
| AR试穿 | 1 | 0 | 1 | 3天 |
| **合计** | **19** | **6** | **8** | **24天** |

---

## 十、后续对接说明

当本地模拟版本完成后，可选择对接 `mall-trade` 后台系统：

1. **替换mock数据**：将各utils模块的数据源从本地storage改为API调用
2. **用户体系对接**：使用mall-user-service的用户系统
3. **商品数据对接**：使用mall-product-service的商品数据
4. **订单流程对接**：使用mall-order-service的订单系统
5. **支付对接**：使用mall-payment-service的支付系统

---

**文档版本**: v1.0  
**创建时间**: 2026-09-02  
**维护人**: opencode
