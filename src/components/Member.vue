<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import useStore from '../store';
import { Edit, Plus, Minus, Switch } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { zim } from '../utils';

const zimStore = useStore();
const convInfo = zimStore.convInfo;
const userInfo = zimStore.user;
const userMap = zimStore.userMap;
const memberList = zimStore.memberList;
const totalMemberCount = zimStore.totalMemberCount;

const activeTab = ref('conv');

const dialogTitles = [
  'Edit group info',
  'Invite member',
  'Delete member',
  'Change the group owner to',
  'Edit group notice',
];
const dialogType = ref(0);
const dialogCheck = ref('');
const dialogForm = reactive({
  name: '',
  notice: '',
  avatar: '',
  note: '',
  ids: '',
});

const avatarOptions = [
  { label: '1.jpeg', value: '1.jpeg' },
  { label: '2.jpeg', value: '2.jpeg' },
  { label: '3.jpeg', value: '3.jpeg' },
  { label: '4.jpeg', value: '4.jpeg' },
  { label: '5.jpeg', value: '5.jpeg' },
];

const groupMemberStateTips: any = { 1: 'Joined', 2: 'Left', 4: 'KickedOut', 5: 'Invited' };

onMounted(() => {
  dialogForm.note = convInfo.note;

  zim.on('groupMemberStateChanged', (zim: any, data: any) => {
    if (data.groupID == convInfo.conversationID && convInfo.type == 2) {
      zimStore.queryGroupMemberList();
      zimStore.queryGroupMemberCount();
    }
    const ids = data.userList.map((v: any) => v.userID).join();
    const message = `event: ${groupMemberStateTips[data.event]}, operator: ${data.operatedInfo.userID}, ids: ${ids}`;
    zimStore.insertMessageToLocalDB({ type: 1, message }, data.groupID, 2, data.operatedInfo.userID);
  });
  zim.on('roomMemberJoined', (zim: any, data: any) => {
    if (data.roomID == convInfo.conversationID && convInfo.type == 1) {
      zimStore.queryRoomMember();
      zimStore.queryRoomOnlineMemberCount(data.roomID);
    }
  });
  zim.on('roomMemberLeft', (zim: any, data: any) => {
    if (data.roomID == convInfo.conversationID && convInfo.type == 1) {
      zimStore.queryRoomMember();
      zimStore.queryRoomOnlineMemberCount(data.roomID);
    }
  });
});

const showDialogForm = (type: number) => {
  dialogType.value = type;
  dialogForm.name = '';
  dialogForm.notice = '';
  dialogForm.avatar = '';
  dialogForm.note = '';
  dialogForm.ids = '';
};

const updateGroupName = () => {
  if (dialogForm.name) {
    zimStore.updateGroupName(convInfo.conversationID, dialogForm.name).then((res: any) => {
      if (!res.code) {
        zimStore.queryConversationList();
        ElMessage({
          message: 'Success',
          type: 'success',
        });
      }
    });
  }
};

const updateGroupNotice = () => {
  if (dialogForm.notice) {
    zimStore.updateGroupNotice(convInfo.conversationID, dialogForm.notice).then((res: any) => {
      if (!res.code) {
        zimStore.queryConversationList();
        zimStore.convInfo.notice = dialogForm.notice;
        ElMessage({
          message: 'Success',
          type: 'success',
        });
      }
    });
  }
};

const updateGroupAvatar = () => {
  if (dialogForm.avatar) {
    zimStore.updateGroupAvatarUrl(convInfo.conversationID, dialogForm.avatar).then((res: any) => {
      if (!res.code) {
        zimStore.queryConversationList();
        zimStore.convInfo.avatar = dialogForm.avatar;
        ElMessage({
          message: 'Success',
          type: 'success',
        });
      }
    });
  }
};

const updateGroupRemark = () => {
  if (dialogForm.note) {
    zimStore.setGroupAttributes(convInfo.conversationID, { remark: dialogForm.note }).then(() => {
      convInfo.note = dialogForm.note;
    });
  }
};

const inviteUsersIntoGroup = () => {
  if (dialogForm.ids) {
    const ids = dialogForm.ids.split(',');
    zimStore.inviteUsersIntoGroup(convInfo.conversationID, ids).then((res: any) => {
      if (!res.code) {
        zimStore.queryGroupMemberList();
        ElMessage({
          message: 'Success',
          type: 'success',
        });
      }
    });
  }
};

const kickGroupMembers = () => {
  if (dialogCheck.value) {
    zimStore.kickGroupMembers(convInfo.conversationID, [dialogCheck.value]).then((res: any) => {
      if (!res.code) {
        zimStore.queryGroupMemberList();
        ElMessage({
          message: 'Success',
          type: 'success',
        });
      }
    });
  }
};

const transferGroupOwner = () => {
  if (!dialogCheck.value) return;
  zimStore.transferGroupOwner(convInfo.conversationID, dialogCheck.value).then((res: any) => {
    if (!res.code) {
      zimStore.queryGroupMemberList();
      ElMessage({
        message: 'Success',
        type: 'success',
      });
    }
  });
};

const changeRoomAttributes = () => {
  if (dialogForm.notice) {
    zimStore.setRoomAttributes({ RoomNotice: dialogForm.notice }, convInfo.conversationID).then((res: any) => {
      if (!res.code) {
        zimStore.convInfo.notice = dialogForm.notice;
        ElMessage({
          message: 'Success',
          type: 'success',
        });
      }
    });
  }
};

const onDialogSubmit = () => {
  if (dialogType.value == 1) {
    updateGroupName();
    updateGroupNotice();
    updateGroupRemark();
    updateGroupAvatar();
  } else if (dialogType.value == 2) {
    inviteUsersIntoGroup();
  } else if (dialogType.value == 3) {
    kickGroupMembers();
  } else if (dialogType.value == 4) {
    transferGroupOwner();
  } else if (dialogType.value == 5) {
    changeRoomAttributes();
  }
  dialogType.value = 0;
};
</script>

<template>
  <el-scrollbar class="container-member">
    <p class="tools">
      <span class="tips">Notice</span>
      <el-button type="text" :icon="Edit" @click="showDialogForm(convInfo.type == 2 ? 1 : 5)"></el-button>
    </p>
    <span class="padding">{{ convInfo.notice || 'Notice' }}</span>
    <p class="tips padding" v-if="convInfo.type == 2">Remark</p>
    <span class="padding" v-if="convInfo.type == 2">{{ convInfo.note || 'Remark' }}</span>
    <p class="tools member">
      <span class="tips"> Members({{ totalMemberCount }})</span>
      <template v-if="convInfo.type == 2">
        <el-button type="text" :icon="Plus" @click="showDialogForm(2)"></el-button>
        <el-button type="text" :icon="Minus" @click="showDialogForm(3)"></el-button>
        <el-button type="text" :icon="Switch" @click="showDialogForm(4)"></el-button>
      </template>
    </p>
    <ul class="padding">
      <li v-for="item in memberList" :key="item.userID">
        <el-avatar :size="24" :src="userMap[item.userID]?.memberAvatarUrl" />
        <span>{{ item.userName || item.userID }}</span>
      </li>
    </ul>

    <!-- Dialog form -->
    <el-dialog v-model="dialogType" :center="true" :title="dialogTitles[dialogType - 1]" width="40%" top="50px">
      <el-form v-if="dialogType < 3" :model="dialogForm" label-width="90px">
        <template v-if="dialogType == 1">
          <el-form-item label="Name">
            <el-input v-model="dialogForm.name"></el-input>
          </el-form-item>
          <el-form-item label="Avatar">
            <el-select v-model="dialogForm.avatar">
              <el-option v-for="item in avatarOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="Notice">
            <el-input v-model="dialogForm.notice"></el-input>
          </el-form-item>
          <el-form-item label="Remark">
            <el-radio-group v-model="dialogForm.note">
              <el-radio label="Socialize"></el-radio>
              <el-radio label="Delicacy"></el-radio>
              <el-radio label="Fitness"></el-radio>
            </el-radio-group>
          </el-form-item>
        </template>
        <el-form-item v-else label="User ID">
          <el-input v-model="dialogForm.ids" placeholder="Separated by ','" type="textarea"></el-input>
        </el-form-item>
      </el-form>
      <el-form v-else-if="dialogType == 5" :model="dialogForm" label-width="90px">
        <el-form-item label="Notice">
          <el-input v-model="dialogForm.notice"></el-input>
        </el-form-item>
      </el-form>
      <el-radio-group v-else v-model="dialogCheck" style="max-height: 260px">
        <el-radio
          v-for="item in memberList"
          :key="item.userID"
          :label="item.userID"
          :disabled="item.userID == userInfo.userID"
        >
          {{ item.userName || item.userID }}
        </el-radio>
      </el-radio-group>
      <template #footer>
        <el-button type="primary" @click="onDialogSubmit">OK</el-button>
      </template>
    </el-dialog>
  </el-scrollbar>
</template>

<style scoped lang="scss">
$border: 1px solid var(--el-border-color-base);

.container-member {
  width: 140px;
  border-left: $border;

  .padding {
    padding: 6px;
  }
  .tools {
    padding-left: 6px;
    padding-right: 6px;
    display: flex;
    line-height: 32px;
    > span {
      flex: 1;
    }
    .el-button + .el-button {
      margin-left: 6px;
    }
  }
  .member {
    border-top: $border;
  }
  li {
    padding-bottom: 4px;
    display: flex;
    align-items: center;
  }
}
</style>
