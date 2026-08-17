Component({
  properties: {
    goods: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('tapgoods', { id: this.data.goods.id })
    }
  }
})
