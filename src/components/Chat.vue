<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import useStore from '../store/index';
import { MoreFilled, UserFilled, Picture, VideoCamera, Files, Microphone, Warning } from '@element-plus/icons-vue';
import Member from './Member.vue';
import { zim } from '../utils';

const props = defineProps<{
  id: string;
  type: number;
  name: string;
}>();

const zimStore = useStore();
const convInfo = zimStore.convInfo;
const byteMsg = ref(false);
const textMsg = ref('');
const isOwner = ref(false);
const msgList = zimStore.msgList;
const userMap = computed(() => zimStore.userMap) as any;

const setChatName = (count: number) => `${convInfo.conversationName}(${count})`;

const isURLImg = (value: string) => /^https?:\/\/\w*.(png|jpg|jpeg|svg|webp|gif|bmp)$/i.test(value);

const sendMsg = () => {
  if (isURLImg(textMsg.value)) {
    zimStore
      .sendMediaMessage(
        { fileDownloadUrl: textMsg.value, type: 11 },
        convInfo.conversationID,
        convInfo.type,
        (message: any, currentSize: number, totalSize: number) => {
          console.warn('file process', { message, currentSize, totalSize });
        },
      )
      .then((res: any) => {
        if (res.conversationID) msgList.push(res);
      });
    return;
  }
  zimStore.sendChatMessage(convInfo.type, textMsg.value, convInfo.conversationID, byteMsg.value).then((res: any) => {
    if (res.conversationID) msgList.push(res);
  });
  textMsg.value = '';
};

const getAvatar = (item: any) => {
  const id = item.senderUserID;
  if (convInfo.type == 0) {
    return item.direction ? zimStore.userMap[id]?.memberAvatarUrl : zimStore.user.memberAvatarUrl;
  }

  if (convInfo.type == 2) {
    return zimStore.userMap[id]?.memberAvatarUrl;
  }
};

const sendMediaMessage = (type: number) => {
  let input = document.createElement('input') as any;
  input.type = 'file';
  input.onchange = function () {
    // eslint-disable-next-line
    const file = this.files[0];
    console.log({ file, convInfo });
    const params = { fileLocalPath: file, type } as any;
    if (type == 13) params.audioDuration = 5;
    if (type == 14) params.videoDuration = 5;
    zimStore
      .sendMediaMessage(
        params,
        convInfo.conversationID,
        convInfo.type,
        (message: any, currentSize: number, totalSize: number) => {
          console.warn('file process', { message, currentSize, totalSize });
        },
      )
      .then((res: any) => {
        if (res.conversationID) msgList.push(res);
      });
    input = null;
  };
  input.click();
};

const initEvent = () => {
  zim.on('groupNameUpdated', (zim: any, data: any) => {
    const { groupID, groupName } = data;
    if (groupID == convInfo.conversationID && convInfo.type == 2) {
      convInfo.conversationName = groupName;
    }
    const message = `${data.operatedInfo.userID} updated group name`;
    zimStore.insertMessageToLocalDB({ type: 1, message }, data.groupID, 2, data.operatedInfo.userID);
  });
  zim.on('groupNoticeUpdated', (zim: any, data: any) => {
    if (data.groupID == convInfo.conversationID && convInfo.type == 2) {
      convInfo.notice = data.groupNotice;
    }
    const message = `${data.operatedInfo.userID} updated group notice`;
    zimStore.insertMessageToLocalDB({ type: 1, message }, data.groupID, 2, data.operatedInfo.userID);
  });
  zim.on('groupAttributesUpdated', (zim: any, data: any) => {
    if (data.groupID == convInfo.conversationID && convInfo.type == 2) {
      convInfo.note = data.infoList[0].groupAttributes.remark;
    }
    const message = `${data.operatedInfo.userID} updated group attributes`;
    zimStore.insertMessageToLocalDB({ type: 1, message }, data.groupID, 2, data.operatedInfo.userID);
  });
  zim.on('roomAttributesUpdated', (zim: any, data: any) => {
    if (data.roomID == convInfo.conversationID && convInfo.type == 1) {
      convInfo.notice = data.infos[0].roomAttributes.notice;
    }
  });
};

const deleteConversation = () => {
  zimStore.deleteConversation(convInfo.conversationID, convInfo.type).then((res: any) => {
    if (!res.code) {
      msgList.length = 0;
    }
  });
};

const leaveGroup = () => {
  zimStore.leaveGroup(convInfo.conversationID).then((res: any) => {
    if (!res.code) {
      zimStore.queryConversationList();
      zimStore.convInfo.conversationID = '';
    }
  });
};

const dismissGroup = () => {
  zimStore.dismissGroup(convInfo.conversationID);
};

const leaveRoom = () => {
  zimStore.leaveRoom(convInfo.conversationID);
};

onMounted(() => {
  initEvent();
});
</script>

<template>
  <div class="container-chat">
    <div class="toolbar">
      <span class="name">{{ convInfo.conversationName }}[{{ convInfo.conversationID }}]</span>
      <el-dropdown v-if="type" trigger="click">
        <el-icon><MoreFilled /> </el-icon>
        <template #dropdown>
          <el-dropdown-menu>
            <template v-if="type == 2">
              <el-dropdown-item @click="deleteConversation"> Clear chat history </el-dropdown-item>
              <el-dropdown-item @click="leaveGroup"> Delete and leave </el-dropdown-item>
              <el-dropdown-item v-if="isOwner" @click="dismissGroup"> Ungroup and leave </el-dropdown-item>
            </template>
            <el-dropdown-item v-if="type == 1" @click="leaveRoom"> Leave room </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <div class="content">
      <div class="chat">
        <el-scrollbar class="list">
          <div v-for="item in msgList" :key="item.messageID" :class="item.direction ? 'item l' : 'item r'">
            <span v-if="item.isUserInserted" class="tips msg">{{ item.message }}</span>
            <el-avatar v-if="!item.isUserInserted" :size="32" :src="getAvatar(item)" />
            <div v-if="!item.isUserInserted" class="msg-wrap">
              <span class="name">{{ userMap[item.senderUserID]?.userName || item.senderUserID }}</span>
              <!-- Plain -->
              <span v-if="item.type == 1 || item.type == 2 || item.type == 20 || item.sentStatus == 2" class="msg">
                <Warning v-if="item.sentStatus == 2" color="red" style="width: 16px; height: 16px" />
                {{ item.message || item.fileName }}
              </span>
              <!-- Image -->
              <img
                v-else-if="item.type == 11"
                class="msg"
                width="240"
                :src="item.thumbnailDownloadUrl || item.fileDownloadUrl"
              />
              <!-- Video -->
              <video
                v-else-if="item.type == 14"
                class="msg"
                width="240"
                controls
                :poster="item.videoFirstFrameDownloadUrl"
                :src="item.fileDownloadUrl"
              >
              </video>
              <!-- Other file -->
              <span class="msg" v-else>
                <a target="_blank" :href="item.fileDownloadUrl">{{ item.fileName }}</a>
              </span>
            </div>
          </div>
        </el-scrollbar>
        <div class="msgbox">
          <div class="tool">
            <ul class="feature-bar">
              <li>
                <el-icon @click="sendMediaMessage(11)"><Picture /></el-icon>
              </li>
              <li>
                <el-icon @click="sendMediaMessage(14)"><VideoCamera /></el-icon>
              </li>
              <li>
                <el-icon @click="sendMediaMessage(13)"><Microphone /></el-icon>
              </li>
              <li>
                <el-icon @click="sendMediaMessage(12)"><Files /></el-icon>
              </li>
              <li><el-checkbox v-model="byteMsg">byte</el-checkbox></li>
            </ul>
          </div>
          <el-input
            v-model="textMsg"
            placeholder="Shift + Enter"
            :rows="4"
            type="textarea"
            resize="none"
            input-style="border: none"
            @keydown.enter.exact.prevent="sendMsg"
          ></el-input>
        </div>
      </div>
      <Member v-if="type" v-bind="props" />
    </div>
  </div>
</template>

<style scoped lang="scss">
$border: 1px solid var(--el-border-color-base);

.container-chat {
  flex: 1;
  display: flex;
  flex-direction: column;

  .toolbar {
    height: 32px;
    border-bottom: $border;
    padding: 8px;
    line-height: 32px;

    .name {
      font-size: 20px;
      font-weight: bold;
    }

    .el-dropdown {
      float: right;
      cursor: pointer;
      color: var(--el-color-primary);
      padding-top: 9px;
    }
  }

  .content {
    flex: 1;
    display: flex;
    overflow: hidden;

    .chat {
      flex: 1;

      .list {
        flex: 1;
        padding: 6px 0;
        max-height: calc(100% - 140px);

        .item {
          padding: 0 6px 6px;
          display: flex;
          align-items: flex-start;
          text-align: center;

          > .tips {
            flex: 1;
            color: gainsboro;
            font-size: 12px;
          }

          .msg {
            padding: 4px;
            border-radius: 4px;
            word-break: break-all;
          }

          .msg-wrap {
            max-width: 70%;
            padding: 0 6px;
            display: flex;
            flex-direction: column;
            .name {
              color: gray;
              font-size: 12px;
            }
          }
        }
        .l .msg-wrap .msg {
          background-color: #f1f1f1;
        }
        .r .msg-wrap .msg {
          background-color: #409eff;
        }
        .r {
          flex-direction: row-reverse;
        }
        .l .msg-wrap {
          align-items: flex-start;
        }
        .r .msg-wrap {
          align-items: flex-end;
        }
      }

      .msgbox {
        border-top: $border;
      }
      .tool {
        .feature-bar {
          width: 100%;
          height: 24px;
          display: flex;
          align-items: center;
          li {
            display: inline-block;
            margin-right: 12px;
            cursor: pointer;
          }

          :last-child {
            float: right;
          }
        }
        padding: 0 12px;
      }
    }

    .el-textarea {
      font-size: 14px;
    }
  }
}
</style>
