<template>
  <div id="app">
    <v-app>
      <v-content app>
        <v-container fluid>
          <router-view/>
        </v-container>
      </v-content>
    </v-app>
  </div>
</template>

<style lang="scss">
  @import "~vuetify/dist/vuetify.min.css";
  @import url("http://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Material+Icons");
  #app {
    @extend %app;
  }
</style>
