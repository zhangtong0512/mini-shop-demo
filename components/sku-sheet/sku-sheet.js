/**
 * 商品规格选择底部弹层（半屏）
 * 用法：
 *   <sku-sheet id="skuSheet" />
 *   const res = await this.selectComponent('#skuSheet').show(goods, { mode: 'cart' })
 *   res === null 表示取消；否则返回 { skuKey, count }
 *   mode: 'cart'（确定）| 'buy'（立即购买）
 */
const mock = require('../../utils/mock')

Component({
  data: {
    visible: false,
    closing: false,
    goods: null,
    specs: [],          // [{ name, values[], selected }]
    skuKey: '',
    price: 0,
    stock: 0,
    hasSpec: false,
    count: 1,
    confirmText: '确定',
    canConfirm: false
  },

  methods: {
    noop() {},

    show(goods, opts) {
      opts = opts || {}
      const specs = (goods && goods.specs) || []
      const hasSpec = specs.length > 0
      // 默认选中每个维度第一个值，打开即有合法 SKU
      const sel = specs.map(s => (s.values[0] != null ? s.values[0] : ''))
      const computed = this._calc(goods, sel)
      this.setData({
        visible: true,
        closing: false,
        goods,
        hasSpec,
        specs: specs.map((s, i) => ({ name: s.name, values: s.values, selected: sel[i] })),
        skuKey: computed.skuKey,
        price: computed.price,
        stock: computed.stock,
        count: Math.max(1, opts.count || 1),
        confirmText: opts.mode === 'buy' ? '立即购买' : '确定',
        canConfirm: computed.valid
      })
      return new Promise(resolve => {
        this._resolve = resolve
      })
    },

    // 由选中的各维值计算当前 SKU
    _calc(goods, sel) {
      const specs = (goods && goods.specs) || []
      let result
      if (!specs.length) {
        result = { skuKey: '', price: goods.price, stock: goods.stock, valid: true }
      } else {
        const skuKey = sel.join('|')
        const sku = (goods.skus || []).find(s => s.key === skuKey)
        if (!sku) {
          return { skuKey: '', price: goods.price, stock: 0, valid: false }
        }
        result = { skuKey, price: sku.price, stock: sku.stock, valid: sku.stock > 0 }
      }
      // 闪购商品统一按秒杀价展示（与详情页/购物车/结算一致，价格在加购时固化）
      if (mock.isFlashActive(goods)) {
        result.price = mock.getEffectivePrice(goods)
      }
      return result
    },

    onDimTap(e) {
      const dim = Number(e.currentTarget.dataset.dim)
      const val = e.currentTarget.dataset.val
      const specs = this.data.specs.slice()
      specs[dim] = Object.assign({}, specs[dim], { selected: val })
      const computed = this._calc(this.data.goods, specs.map(s => s.selected))
      this.setData({
        specs,
        skuKey: computed.skuKey,
        price: computed.price,
        stock: computed.stock,
        canConfirm: computed.valid,
        count: Math.min(this.data.count, computed.valid ? computed.stock : 1)
      })
    },

    onMinus() {
      if (this.data.count > 1) this.setData({ count: this.data.count - 1 })
    },

    onPlus() {
      if (this.data.stock > 0 && this.data.count < this.data.stock) {
        this.setData({ count: this.data.count + 1 })
      }
    },

    onConfirm() {
      if (!this.data.canConfirm) {
        if (this.data.stock <= 0) {
          wx.showToast({ title: '该规格暂时缺货', icon: 'none' })
        }
        return
      }
      this.finish({ skuKey: this.data.skuKey, count: this.data.count })
    },

    onCancel() {
      if (this.data.closing) return
      this.finish(null)
    },

    finish(result) {
      this.setData({ closing: true })
      setTimeout(() => {
        this.setData({ visible: false, closing: false })
        const resolve = this._resolve
        this._resolve = null
        if (resolve) resolve(result)
      }, 220)
    }
  }
})
