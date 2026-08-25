/**
 * 商品排序栏：综合 / 销量 / 价格(升降切换) / 最新 / 筛选(价格区间)
 * 用法：
 *   <sort-bar bind:sortchange="onSortchange" bind:pricechange="onPricechange" showFilter="{{true}}" />
 *   onSortchange(e)  → e.detail.mode: 'default'|'sales'|'priceAsc'|'priceDesc'|'newest'
 *   onPricechange(e) → e.detail: { min, max }（max 可为 Infinity）
 *   showFilter=false 时隐藏价格筛选（收藏页仅排序）
 */
Component({
  properties: {
    showFilter: { type: Boolean, value: true }
  },

  data: {
    mode: 'default',
    filterOpen: false,
    priceIndex: 0,
    priceLabel: '全部',
    PRICE_RANGES: [
      { label: '全部', min: 0, max: Infinity },
      { label: '0-100', min: 0, max: 100 },
      { label: '100-500', min: 100, max: 500 },
      { label: '500-1000', min: 500, max: 1000 },
      { label: '1000+', min: 1000, max: Infinity }
    ]
  },

  methods: {
    onSortTap(e) {
      const m = e.currentTarget.dataset.mode
      let next = m
      // 价格：升/降切换
      if (m === 'price') {
        next = this.data.mode === 'priceAsc' ? 'priceDesc' : 'priceAsc'
      }
      this.setData({ mode: next })
      this.triggerEvent('sortchange', { mode: next })
    },

    onFilterTap() {
      this.setData({ filterOpen: !this.data.filterOpen })
    },

    onPriceTap(e) {
      const idx = Number(e.currentTarget.dataset.idx)
      const r = this.data.PRICE_RANGES[idx]
      this.setData({
        priceIndex: idx,
        priceLabel: r.label,
        filterOpen: false
      })
      this.triggerEvent('pricechange', { min: r.min, max: r.max })
    }
  }
})
