<script setup lang="ts">
import { computed } from 'vue';
import useStore from '../store/index';
import { ChatRound, User, Close } from '@element-plus/icons-vue';
import Conversation from './Conversation.vue';
import Group from './Group.vue';

const zimStore = useStore();
const unreadMessageCount = computed(() => zimStore.unreadMessageCount);
const activedTab = computed(() => zimStore.activedTab);
const user = computed(() => zimStore.user);

const showTab = (tab: string) => {
  zimStore.activedTab = tab;
  if (tab == 'conv') {
    zimStore.queryConversationList();
  }
  if (tab == 'group') {
    zimStore.getGroupList();
  }
};

const logout = () => {
  zimStore.logout();
  zimStore.$reset();
  location.reload();
};
</script>

<template>
  <div class="container layout">
    <div class="sidebar">
      <el-avatar :src="user.memberAvatarUrl"></el-avatar>
      <span class="name ellipsis">id:{{ user.userID }}</span>
      <span class="name ellipsis">{{ user.userName }}</span>
      <div class="menu">
        <el-badge :value="unreadMessageCount" :hidden="unreadMessageCount == 0">
          <el-button type="text" :icon="ChatRound" @click="showTab('conv')"></el-button>
        </el-badge>
        <el-button type="text" :icon="User" @click="showTab('group')"></el-button>
      </div>
      <el-button style="color: red" type="text" :icon="Close" @click="logout"></el-button>
    </div>
    <Conversation v-show="activedTab == 'conv'" />
    <Group v-show="activedTab == 'group'" />
  </div>
</template>
