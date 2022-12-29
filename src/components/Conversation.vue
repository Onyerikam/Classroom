<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import useStore from '../store/index';
import { Plus, MuteNotification, Bell } from '@element-plus/icons-vue';
import Chat from './Chat.vue';
import { zim } from '../utils';

const zimStore = useStore();
const convList = computed(() => zimStore.convs);
const convInfo = zimStore.convInfo;
const msgList = zimStore.msgList;

const formatTime = (time: number) => new Date(time).toLocaleString().slice(5, -3);
const formatMsg = (conv: any) => {
  const msg = conv.lastMessage;
  if (!msg) return '';
  let str = msg.message;
  switch (msg.type) {
    case 11:
      str = `[Image]-${msg.fileName}`;
      break;
    case 12:
      str = `[File]-${msg.fileName}`;
      break;
    case 13:
      str = `[Audio]-${msg.fileName}`;
      break;
    case 14:
      str = `[Video]-${msg.fileName}`;
      break;
  }
  return conv.type ? `[${msg.senderUserID}]: ${str}` : str;
};

const avatarOptions = [
  { label: '1.jpeg', value: '1.jpeg' },
  { label: '2.jpeg', value: '2.jpeg' },
  { label: '3.jpeg', value: '3.jpeg' },
  { label: '4.jpeg', value: '4.jpeg' },
  { label: '5.jpeg', value: '5.jpeg' },
];

const groupStateTips: any = { 1: 'Created', 2: 'Dismissed', 3: 'Joined', 4: 'Invited', 5: 'Left', 6: 'KickedOut' };

const initEvent = () => {
  zim.on('receivePeerMessage', (zim: any, data: any) => {
    console.warn('receivePeerMessage', data);
    const { messageList, fromConversationID } = data as any;
    if (fromConversationID == convInfo.conversationID && convInfo.type == 0) {
      msgList.push(...messageList);
    }
  });
  zim.on('receiveGroupMessage', (zim: any, data: any) => {
    const { messageList, fromConversationID } = data as any;
    if (fromConversationID == convInfo.conversationID && convInfo.type == 2) {
      msgList.push(...messageList);
    }
  });
  zim.on('receiveRoomMessage', (zim: any, data: any) => {
    const { messageList, fromConversationID } = data as any;
    if (fromConversationID == convInfo.conversationID && convInfo.type == 1) {
      msgList.push(...messageList);
    }
  });
  zim.on('conversationChanged', (zim: any, data: any) => {
    zimStore.conversationChanged(data);
  });
  zim.on('groupStateChanged', (zim: any, data: any) => {
    if (!zimStore.isLogin) return;

    const message = `event: ${groupStateTips[data.event]}, operator: ${data.operatedInfo.userID}`;
    zimStore.insertMessageToLocalDB({ type: 1, message }, data.groupID, 2, data.operatedInfo.userID);
    if (data.event == 4) {
      zimStore.queryConversationList();
    }
  });
  zim.on('groupAvatarUrlUpdated', (zim: any, data: any) => {
    zimStore.queryConversationList();
    zimStore.getGroupList();
    const message = `${data.operatedInfo.userID} updated group avatar url`;
    zimStore.insertMessageToLocalDB({ type: 1, message }, data.groupID, 2, data.operatedInfo.userID);
  });
};

onMounted(async () => {
  zimStore.isLogged && (await zimStore.queryConversationList());
  initEvent();
});

const dialogTitles = [
  'Update user info',
  'Create a 1v1 chat',
  'Create a group chat',
  'Join a group',
  'Create a room',
  'Join a room',
];
const dialogType = ref(0);
const dialogForm = reactive({
  id: '',
  name: '',
  avatar: '',
  note: 'Fitness',
  ids: '',
});
const dialogLabelID = computed(() => {
  switch (dialogType.value) {
    case 2:
      return 'User ID';
    case 3:
    case 4:
      return 'Group ID';
    case 5:
    case 6:
      return 'Room ID';
  }
});

const getConvClass = (conv: any) => {
  return conv.type + conv.conversationID === convInfo.type + convInfo.conversationID ? 'item active' : 'item';
};

const queryRoomAllAttributes = (roomID: string) => {
  zimStore.queryRoomAllAttributes(roomID).then((res: any) => {
    if (!res.code) {
      const { roomAttributes, roomID } = res;
      if (roomID == convInfo.conversationID && roomAttributes.notice) {
        convInfo.notice = roomAttributes.notice;
      }
    }
  });
};

const setConv = (conv: any) => {
  convInfo.type = conv.type;
  convInfo.conversationID = conv.conversationID;
  convInfo.conversationName = conv.conversationName;
  if (conv.type == 0) {
    zimStore.setUserMap([zimStore.user.userID, conv.conversationID]);
  }
  if (conv.type == 1) {
    zimStore.queryRoomMember();
    queryRoomAllAttributes(convInfo.conversationID);
  }
  if (conv.type == 2) {
    zimStore.queryAllGroupInfo(conv.conversationID);
  }
  zimStore.queryHistoryMessage(conv.conversationID, conv.type);
  zimStore.clearConversationUnreadMessageCount(conv.conversationID, conv.type);
};

const setConversationNotificationStatus = (item: any) => {
  const status = item.notificationStatus == 2 ? 1 : 2;
  zimStore.setConversationNotificationStatus(status, item.conversationID, item.type);
};

const showDialogForm = (type: number) => {
  dialogType.value = type;
  dialogForm.id = '';
  dialogForm.name = '';
  dialogForm.avatar = dialogForm.avatar || Math.ceil(Math.random() * 5) + '.jpeg';
  dialogForm.note = dialogForm.note || '';
  dialogForm.ids = '';
};

const onDialogSubmit = () => {
  convInfo.note = '';
  convInfo.notice = '';
  if (dialogType.value == 1) {
    dialogType.value = 0;
    zimStore.setUserInfo({ name: dialogForm.name, avatar: dialogForm.avatar });
  } else if (dialogType.value == 2) {
    convInfo.conversationID = dialogForm.id;
    convInfo.conversationName = dialogForm.id;
    convInfo.type = 0;
    dialogType.value = 0;
    zimStore.queryHistoryMessage(dialogForm.id, 0);
  } else if (dialogType.value == 3) {
    const groupInfo = {
      groupID: dialogForm.id || '',
      groupName: dialogForm.name || '',
      groupAvatarUrl: dialogForm.avatar || '',
    };
    const users = dialogForm.ids.split(',');
    zimStore.createGroup(groupInfo, users, { groupAttributes: { remark: dialogForm.note } }).then((res: any) => {
      if (!res.code) {
        const id = res.groupInfo.baseInfo.groupID;
        convInfo.conversationID = id;
        convInfo.conversationName = res.groupInfo.baseInfo.groupName;
        convInfo.type = 2;
        dialogType.value = 0;
        zimStore.queryHistoryMessage(id, 2);
        zimStore.queryAllGroupInfo(id);
      }
    });
  } else if (dialogType.value == 4) {
    zimStore.joinGroup(dialogForm.id).then((res: any) => {
      if (!res.code) {
        const id = res.groupInfo.baseInfo.groupID;
        convInfo.conversationID = id;
        convInfo.conversationName = res.groupInfo.baseInfo.groupName;
        convInfo.type = 2;
        dialogType.value = 0;
        zimStore.queryHistoryMessage(id, 2);
        zimStore.queryAllGroupInfo(id);
      }
    });
  } else if (dialogType.value == 5) {
    const roomInfo = {
      roomID: dialogForm.id,
      roomName: dialogForm.name,
    };
    zimStore.createRoom(roomInfo, { attr: dialogForm.note }).then((res: any) => {
      if (!res.code) {
        convInfo.conversationID = dialogForm.id;
        convInfo.conversationName = dialogForm.name;
        convInfo.type = 1;
        dialogType.value = 0;
        zimStore.msgList.length = 0;
        zimStore.queryRoomMember();
        zimStore.queryHistoryMessage(dialogForm.id, 1);
      }
    });
  } else if (dialogType.value == 6) {
    zimStore.joinRoom(dialogForm.id).then((res: any) => {
      if (!res.code) {
        convInfo.conversationID = dialogForm.id;
        convInfo.conversationName = res.roomInfo.baseInfo.roomName;
        convInfo.type = 1;
        dialogType.value = 0;
        zimStore.queryRoomMember();
        zimStore.queryHistoryMessage(dialogForm.id, 1);
        queryRoomAllAttributes(dialogForm.id);
      }
    });
  }
};
</script>

<template>
  <div class="content">
    <div class="sidebar">
      <!-- toolbar -->
      <div class="toolbar">
        <span class="title">Conversation list({{ convList.length }})</span>
        <el-dropdown trigger="click">
          <el-icon>
            <Plus />
          </el-icon>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="(item, i) in dialogTitles" :key="i" @click="showDialogForm(i + 1)">
                {{ item }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <!-- conv list -->
      <el-scrollbar class="list">
        <div :class="getConvClass(item)" v-for="item in convList" :key="item.conversationID" @click="setConv(item)">
          <el-badge
            :value="item.unreadMessageCount"
            :is-dot="item.notificationStatus == 2"
            :hidden="!item.unreadMessageCount"
          >
            <el-avatar :size="46" shape="square" :src="item.conversationAvatarUrl" />
          </el-badge>
          <div class="right">
            <div class="flex">
              <span class="title ellipsis">{{ item.conversationName }}</span>
              <span class="tips">{{ formatTime(item.orderKey) }}</span>
            </div>
            <div class="flex">
              <span class="tips ellipsis">{{ formatMsg(item) }}</span>
              <el-icon
                v-if="item.type == 2"
                :size="16"
                color="gray"
                @click.native.stop="setConversationNotificationStatus(item)"
              >
                <MuteNotification v-if="item.notificationStatus == 2" />
                <Bell v-else />
              </el-icon>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <Chat v-if="convInfo.conversationID" :id="convInfo.conversationID" :type="convInfo.type" :name="convInfo.name" />
    <div v-else class="nodata">No data</div>
    <!-- Dialog form -->
    <el-dialog v-model="dialogType" :center="true" :title="dialogTitles[dialogType - 1]" width="50%" top="50px">
      <el-form :model="dialogForm" label-width="90px">
        <el-form-item v-if="dialogType == 1 || dialogType == 3" label="Avatar">
          <el-select v-model="dialogForm.avatar">
            <el-option v-for="item in avatarOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="dialogType !== 1" :label="dialogLabelID">
          <el-input v-model="dialogForm.id"></el-input>
        </el-form-item>
        <template v-if="dialogType == 1 || dialogType == 3 || dialogType == 5">
          <el-form-item label="Name">
            <el-input v-model="dialogForm.name"></el-input>
          </el-form-item>
          <el-form-item label="Remark" v-if="dialogType == 3">
            <el-radio-group v-model="dialogForm.note">
              <el-radio label="Socialize"></el-radio>
              <el-radio label="Delicacy"></el-radio>
              <el-radio label="Fitness"></el-radio>
            </el-radio-group>
          </el-form-item>
        </template>
        <el-form-item v-if="dialogType == 3" label="User ID">
          <el-input v-model="dialogForm.ids" placeholder="Separated by ','" type="textarea"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="onDialogSubmit">OK</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
$border: 1px solid var(--el-border-color-base);

.sidebar {
  width: 260px;
  border-right: $border;
}

.toolbar {
  height: 32px;
  border-bottom: $border;
  padding: 8px;
  text-align: center;
  line-height: 32px;

  .el-dropdown {
    float: right;
    cursor: pointer;
    color: var(--el-color-primary);
    padding-top: 9px;
  }
}

.list {
  max-height: calc(100% - 50px);

  .item {
    height: 48px;
    padding: 12px;
    border-bottom: $border;
    display: flex;
    cursor: pointer;

    .right {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      padding-left: 12px;
    }
  }
}
</style>
