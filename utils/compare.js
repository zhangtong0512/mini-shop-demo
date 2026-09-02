/**
 * 商品对比功能（本地存储，单对象 compareData）
 *
 * 功能：商品对比列表、参数对比、优劣分析
 */
const COMPARE_KEY = 'compareData'

const MAX_COMPARE = 4 // 最多对比4个商品

const DEFAULT = {
  // 对比列表
  compareList: [],
  // 对比记录
  history: []
}

function getCompareData() {
  return Object.assign({}, DEFAULT, wx.getStorageSync(COMPARE_KEY) || {})
}

function saveCompareData(data) {
  wx.setStorageSync(COMPARE_KEY, data)
}

// 首次启动预置对比数据
function ensureSeed() {
  if (wx.getStorageSync(COMPARE_KEY)) return
  saveCompareData(DEFAULT)
}

// 获取对比列表
function getCompareList() {
  return getCompareData().compareList
}

// 添加商品到对比列表
function addToCompare(goodsId) {
  const data = getCompareData()
  
  // 检查是否已存在
  if (data.compareList.some(g => g.id === goodsId)) {
    return { ok: false, msg: '该商品已在对比列表中' }
  }
  
  // 检查是否达到上限
  if (data.compareList.length >= MAX_COMPARE) {
    return { ok: false, msg: '最多对比' + MAX_COMPARE + '个商品' }
  }
  
  data.compareList.push({ id: goodsId, addTime: new Date().toISOString() })
  saveCompareData(data)
  return { ok: true, msg: '已添加到对比' }
}

// 从对比列表移除
function removeFromCompare(goodsId) {
  const data = getCompareData()
  const index = data.compareList.findIndex(g => g.id === goodsId)
  if (index > -1) {
    data.compareList.splice(index, 1)
    saveCompareData(data)
    return { ok: true, msg: '已移除' }
  }
  return { ok: false, msg: '商品不在对比列表中' }
}

// 清空对比列表
function clearCompare() {
  const data = getCompareData()
  data.compareList = []
  saveCompareData(data)
  return { ok: true, msg: '已清空' }
}

// 检查商品是否在对比列表中
function isInCompare(goodsId) {
  return getCompareData().compareList.some(g => g.id === goodsId)
}

// 获取对比列表数量
function getCompareCount() {
  return getCompareData().compareList.length
}

// 获取对比商品详情（含mock数据）
function getCompareGoods(mockModule) {
  const data = getCompareData()
  return data.compareList.map(item => {
    const goods = mockModule.getGoodsById(item.id)
    return goods ? { ...item, ...goods } : null
  }).filter(Boolean)
}

// 生成对比维度
function getCompareDimensions() {
  return [
    { key: 'price', label: '价格', type: 'price' },
    { key: 'originalPrice', label: '原价', type: 'price' },
    { key: 'sales', label: '销量', type: 'number' },
    { key: 'stock', label: '库存', type: 'number' },
    { key: 'desc', label: '商品描述', type: 'text' }
  ]
}

// 生成对比结果分析
function analyzeCompare(goodsList) {
  if (goodsList.length < 2) {
    return { ok: false, msg: '至少选择2个商品进行对比' }
  }
  
  const dimensions = getCompareDimensions()
  const analysis = {
    bestPrice: null,
    bestSales: null,
    bestStock: null,
    priceDiff: 0,
    summary: []
  }
  
  // 价格分析
  const prices = goodsList.map(g => g.price).filter(Boolean)
  if (prices.length > 0) {
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    analysis.priceDiff = maxPrice - minPrice
    analysis.bestPrice = goodsList.find(g => g.price === minPrice)
    analysis.summary.push('最低价: ¥' + minPrice)
    if (analysis.priceDiff > 0) {
      analysis.summary.push('价格差异: ¥' + analysis.priceDiff)
    }
  }
  
  // 销量分析
  const sales = goodsList.map(g => g.sales).filter(Boolean)
  if (sales.length > 0) {
    const maxSales = Math.max(...sales)
    analysis.bestSales = goodsList.find(g => g.sales === maxSales)
    analysis.summary.push('最高销量: ' + maxSales + '件')
  }
  
  // 库存分析
  const stocks = goodsList.map(g => g.stock).filter(Boolean)
  if (stocks.length > 0) {
    const maxStock = Math.max(...stocks)
    analysis.bestStock = goodsList.find(g => g.stock === maxStock)
    analysis.summary.push('库存最充足: ' + maxStock + '件')
  }
  
  return { ok: true, analysis, dimensions }
}

// 获取对比历史
function getCompareHistory() {
  return getCompareData().history
}

// 添加对比历史
function addCompareHistory(goodsIds) {
  const data = getCompareData()
  const historyItem = {
    id: 'history_' + Date.now(),
    goodsIds,
    time: new Date().toISOString()
  }
  data.history.unshift(historyItem)
  // 最多保留10条历史
  if (data.history.length > 10) {
    data.history = data.history.slice(0, 10)
  }
  saveCompareData(data)
}

// 清空对比历史
function clearCompareHistory() {
  const data = getCompareData()
  data.history = []
  saveCompareData(data)
}

module.exports = {
  getCompareData,
  saveCompareData,
  ensureSeed,
  getCompareList,
  addToCompare,
  removeFromCompare,
  clearCompare,
  isInCompare,
  getCompareCount,
  getCompareGoods,
  getCompareDimensions,
  analyzeCompare,
  getCompareHistory,
  addCompareHistory,
  clearCompareHistory,
  MAX_COMPARE
}
