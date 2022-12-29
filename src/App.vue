<script setup lang="ts">
import { computed } from 'vue';
import useStore from './store/index';
import Login from './components/Login.vue';
import Layout from './components/Layout.vue';

const zimStore = useStore();
const isLogged = computed(() => zimStore.isLogged);
</script>

<template>
  <div class="bg"></div>
  <Layout v-if="isLogged" key="layout" />
  <Login v-else key="login" />
</template>
