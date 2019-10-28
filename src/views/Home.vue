<template>
  <div>
    <v-container fluid>
      <v-layout
        row
        wrap>
        <v-flex
          xs12
          class="px-0 py-0">
          <chart-container/>
        </v-flex>
      </v-layout>
    </v-container>
  </div>
</template>

<script>

import ChartContainer from '@/components/Chart.UI.Container'

export default {
  name: 'Home',
  components: {
    ChartContainer
  },
  data () {
    return {

    }
  }
}

</script>
