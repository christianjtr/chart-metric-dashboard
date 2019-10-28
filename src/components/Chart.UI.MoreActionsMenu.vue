<template>
  <div>
    <v-menu
      bottom
      left
      full-width>
      <v-btn
        slot="activator"
        icon
        title="More actions">
        <v-icon color="white">more_vert</v-icon>
      </v-btn>
      <v-list>
        <v-list-tile
          v-for="(item, index) in items"
          :key="index"
          :title="item.title"
          @click="callToDummyAction(item.title)">
          <v-list-tile-title>{{ item.title }}</v-list-tile-title>
        </v-list-tile>
      </v-list>
    </v-menu>
  </div>
</template>

<script>

export default {
  name: 'ChartMoreActionsMenu',
  data () {
    return {
      items: [
        { title: 'Expand' },
        { title: 'Export' },
        { title: 'Reduce' }
      ]
    }
  },
  methods: {
    callToDummyAction (action) {
      console.log(`Dummy action: ${action}`)
    }
  }
}

</script>
