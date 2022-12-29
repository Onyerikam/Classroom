<script setup lang="ts">
import {reactive, onMounted} from 'vue';
import useStore from '../store/index';

const zimStore = useStore();
const groupList = zimStore.groupList;
const groupInfo = reactive({groupID: '', groupName: '', groupNotice: ''});

onMounted(() => {
    zimStore.getGroupList();
});

const getGroupClass = (group: any) => {
    return group.groupID === groupInfo.groupID ? 'item active' : 'item';
};

const setGroup = (group: any) => {
    Object.assign(groupInfo, group.baseInfo);
};

const gotoChat = (groupInfo: any) => {
    zimStore.convInfo.conversationID = groupInfo.groupID;
    zimStore.convInfo.conversationName = groupInfo.groupName;
    zimStore.convInfo.type = 2;
    zimStore.activedTab = 'conv';
    zimStore.queryAllGroupInfo(groupInfo.groupID);
    zimStore.queryHistoryMessage(groupInfo.groupID, 2);
};
</script>

<template>
    <div class="content">
        <div class="sidebar">
            <div class="toolbar">
                <span class="title">Groups({{ groupList.length }})</span>
            </div>
            <el-scrollbar class="list">
                <div
                    :class="getGroupClass(item)"
                    v-for="item in groupList"
                    :key="item.baseInfo.groupID"
                    @click="setGroup(item)"
                >
                    <el-avatar :size="26" shape="square" :src="item.baseInfo.groupAvatarUrl"/>
                    <div class="right">
                        <span class="title ellipsis">{{ item.baseInfo.groupName }}</span>
                    </div>
                </div>
            </el-scrollbar>
        </div>
        <div class="container-group" v-if="groupInfo.groupID">g
            <el-avatar :size="108" shape="square" :src="groupInfo.groupAvatarUrl"/>
            <div class="name">{{ groupInfo.groupName }}</div>
            <el-button type="primary" @click="gotoChat(groupInfo)">Join a group</el-button>
        </div>
        <div v-else class="nodata">No data</div>
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
    line-height: 32px;
    text-align: center;
}

.list {
    max-height: calc(100% - 50px);

    .item {
        height: 26px;
        padding: 12px;
        border-bottom: $border;
        display: flex;
        cursor: pointer;

        .right {
            flex: 1;
            display: flex;
            overflow: hidden;
            padding-left: 12px;
            line-height: 26px;
        }
    }
}

.container-group {
    flex: 1;
    text-align: center;
    padding-top: 160px;

    .name {
        font-size: 20px;
        font-weight: bold;
        margin: 12px 0 36px 0;
    }
}
</style>
