<template>
  <div>
    <v-container>
      <v-layout
        row
        wrap>
        <v-flex
          xs6
          sm6
          class="text-md-left text-xs-left">
          <template v-if="Years.length > 0">
            <v-chip
              v-for="(year, index) in Years"
              :key="index"
              :class="[yearSelected === year ? 'chip--selected' : '']"
              label
              class="chip elevation-0"
              @click="setYear(year)">
              {{ year }}
            </v-chip>
          </template>
        </v-flex>
        <v-spacer/>
        <v-flex
          xs3
          sm3
          d-flex
          class="px-2">
          <v-select
            v-model="dataFrequency"
            :items="Frequency"
            :disabled="isDefaultDataFrequencyDefined()"
            item-text="description"
            item-value="id"
            label="Data Frequency"
            color="orange"
            hide-details
            @change="setDataFrequency($event)"
          />
        </v-flex>
        <v-flex
          xs3
          sm3
          d-flex
          class="px-2">
          <v-select
            v-model="monthSelected"
            :items="Months"
            :clear-icon-cb="clearMonth"
            item-text="description"
            item-value="id"
            label="Month"
            color="orange"
            clearable
            clear-icon="cancel"
            hide-details
            @change="setDataMonth($event)"
          />
        </v-flex>
      </v-layout>
    </v-container>
  </div>
</template>

<script>

import { mapState } from 'vuex'

export default {
  name: 'ChartActions',
  data () {
    return {
      yearSelected: null,
      dataFrequency: null,
      monthSelected: null,
      selectAllMonths: {
        id: 0,
        description: 'All months'
      }
    }
  },
  computed: {
    ...mapState('ErrorData', {
      Frequency: state => state.DataFrequency,
      Years: state => state.Years,
      Months: state => state.Months
    })
  },
  created () {
    this.getYears()
  },
  mounted () {
    this.dataFrequency = this.Frequency.find(frequency => frequency.default)
  },
  methods: {
    getYears () {
      this.$store.dispatch('ErrorData/getYears').then(() => {
        this.yearSelected = Math.max(...this.Years)
        this.setYear(this.yearSelected)
      })
    },
    setYear (year) {
      this.yearSelected = year
      this.$store.commit('ErrorData/SET_SELECTED_YEAR', this.yearSelected)
      this.$emit('get-data', year)
    },
    isDefaultDataFrequencyDefined () {
      return !(this.dataFrequency)
    },
    setDataFrequency (frequencyID) {
      this.dataFrequency = this.Frequency.find(frequency => frequency.id === frequencyID)
      this.$store.dispatch('ErrorData/setDataFrequency', this.dataFrequency).then(() => {
        this.$emit('set-data')
      }).catch((error) => {
        throw new Error(error)
      })
    },
    setDataMonth (monthID) {
      this.monthSelected = this.Months.find(month => month.id === monthID)
      this.$store.dispatch('ErrorData/setDataMonth', this.monthSelected).then(() => {
        this.$emit('set-data')
      }).catch((error) => {
        throw new Error(error)
      })
    },
    clearMonth () {
      this.monthSelected = null
      this.$store.dispatch('ErrorData/setDataMonth', this.monthSelected).then(() => {
        this.$emit('set-data')
      }).catch((error) => {
        throw new Error(error)
      })
    }
  }
}
</script>

<style lang="scss" scoped>
  .chip {
    background-color: lightgray;
    cursor: pointer !important;
  }
  .chip--selected {
    @extend .chip;
    background-color: orange !important;
    color: white !important;
  }
</style>
