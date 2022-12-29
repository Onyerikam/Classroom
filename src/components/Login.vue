<script setup lang="ts">
import { reactive } from 'vue';
import useStore from '../store/index';
import { ElMessage } from 'element-plus';

const zimStore = useStore();

const user = reactive({
  userID: '',
  userName: '',
});

const toast = () => {
  ElMessage.success('Hello');
};

const onLogin = () => {
  zimStore.login(user);
};
</script>

<template>
  <div class="container login-from">
    <div class="toolbar">Welcome Back To Social Network</div>
    <el-form :model="user" label-width="90px">
      <el-form-item label="User ID">
        <el-input v-model="user.userID"></el-input>
      </el-form-item>
      <el-form-item label="User Name">
        <el-input v-model="user.userName"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onLogin">Login</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>
