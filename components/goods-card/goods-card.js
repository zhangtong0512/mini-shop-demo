Component({
  properties: {
    goods: {
      type: Object,
      value: {}
    },
    // 是否显示移除角标（收藏页用，首页不传）
    removable: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('tapgoods', { id: this.data.goods.id })
    },
    onRemove() {
      this.triggerEvent('removegoods', { id: this.data.goods.id })
    }
  }
})
