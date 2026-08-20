const mock = require('../../utils/mock')
const search = require('../../utils/search')

Page({
  data: {
    keyword: '',
    history: [],
    hotKeywords: [],
    results: [],
    showResults: false,
    focus: true
  },

  onLoad() {
    this.setData({
      history: search.getHistory(),
      hotKeywords: mock.getHotKeywords()
    })
    // 首帧后取消自动聚焦，避免从详情页返回时键盘再次弹起
    this._focusTimer = setTimeout(() => {
      this.setData({ focus: false })
    }, 600)
  },

  onInput(e) {
    const kw = e.detail.value
    this.setData({ keyword: kw })
    clearTimeout(this._searchTimer)
    if (!kw.trim()) {
      this.setData({ results: [], showResults: false })
      return
    }
    // 防抖：停止输入 300ms 后再搜索
    this._searchTimer = setTimeout(() => this.doSearch(kw), 300)
  },

  // 回车确认：保存历史 + 立即搜索
  onConfirm() {
    const kw = (this.data.keyword || '').trim()
    if (!kw) return
    clearTimeout(this._searchTimer)
    search.addHistory(kw)
    this.setData({ history: search.getHistory() })
    this.doSearch(kw)
  },

  // 点击历史 / 热搜词
  onTapKeyword(e) {
    const kw = e.currentTarget.dataset.kw
    search.addHistory(kw)
    this.setData({ keyword: kw, history: search.getHistory() })
    this.doSearch(kw)
  },

  onClearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定清空搜索历史？',
      success: res => {
        if (res.confirm) {
          search.clearHistory()
          this.setData({ history: [] })
        }
      }
    })
  },

  doSearch(kw) {
    this.setData({ results: mock.searchGoods(kw), showResults: true })
  },

  onTapGoods(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.detail.id })
  },

  onCancel() {
    wx.navigateBack()
  },

  onUnload() {
    clearTimeout(this._searchTimer)
    clearTimeout(this._focusTimer)
  }
})
