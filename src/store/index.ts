import { defineStore } from 'pinia';
import { ZIMGroupMemberInfo } from 'zego-zim-web';
import { ElNotification } from 'element-plus';
import { zim, generateToken, avatarPrefix } from '../utils';

const store = defineStore('zimStore', {
    state: () =>
        ({
            isLogged: false,
            activedTab: 'conv' || 'group',
            user: {
                userID: '',
                userName: '',
                memberAvatarUrl: '',
            },
            userMap: {} as { [index: string]: ZIMGroupMemberInfo },
            convs: [],
            groupList: [],
            memberList: [],
            totalMemberCount: 0,
            convInfo: {
                conversationID: '',
                type: 0,
                unreadMessageCount: 0,
                orderKey: 0,
                notificationStatus: 0,
                lastMessage: null,
                conversationName: '',
                notice: '',
            },
            msgList: [],
        } as any),
    getters: {
        unreadMessageCount(state) {
            return state.convs.reduce((prev: number, curr: any) => {
                const count =
                    curr.unreadMessageCount <= 0 || curr.notificationStatus == 2 ? 0 : curr.unreadMessageCount;
                return prev + count;
            }, 0);
        },
    },
    actions: {
        login(payload: any) {
            this.user = payload;
            return zim
                .login(payload, generateToken(payload.userID, 0))
                .then((res) => {
                    this.isLogged = true;
                    // query self info
                    zim.queryUsersInfo([this.user.userID], { isQueryFromServer: true }).then(({ userList }) => {
                        this.user = { ...userList[0].baseInfo, memberAvatarUrl: userList[0].userAvatarUrl };
                        this.userMap[this.user.userID] = { ...this.user };
                    });
                    return res;
                })
                .catch(on_error);
        },

        logout(isSend = true) {
            this.isLogged = false;
            return isSend && zim.logout();
        },

        setUserInfo(data: any) {
            if (data.name) {
                zim.updateUserName(data.name).then(() => (this.user.userName = data.name));
            }
            let avatar = data.avatar;
            if (avatar) {
                avatar = avatarPrefix + avatar;
                this.userMap[this.user.userID] = { ...this.userMap[this.user.userID], me: avatar };
                this.user.memberAvatarUrl = avatar;
                zim.updateUserAvatarUrl(avatar);
            }
        },

        setUserMap(ids: string[]) {
            if (!ids || !ids.length) return;
            zim.queryUsersInfo(ids, { isQueryFromServer: true }).then(({ userList }) => {
                console.warn({ userList });
                userList.forEach((item) => {
                    this.userMap[item.baseInfo.userID] = { ...item.baseInfo, memberAvatarUrl: item.userAvatarUrl };
                });
            });
            console.warn('setUserMap', ids, JSON.stringify(this.userMap));
        },

        queryConversationList(): any {
            return zim
                .queryConversationList({
                    count: 100,
                })
                .then((res) => {
                    console.warn('queryConversationList', res);
                    this.convs = res.conversationList;
                    this.convs.sort((a: any, b: any) => b.orderKey - a.orderKey);
                    const ids: string[] = [];
                    res.conversationList.forEach((item: any) => {
                        if (item.type == 0) {
                            if (!item.conversationName || !item.conversationAvatarUrl) {
                                ids.push(item.conversationID);
                            } else {
                                this.userMap[item.conversationID] = {
                                    ...this.userMap[item.conversationID],
                                    userID: item.conversationID,
                                    userName: item.conversationName,
                                    memberAvatarUrl: item.conversationAvatarUrl,
                                };
                            }
                        }
                    });
                    this.setUserMap(ids);
                    return res;
                })
                .catch(on_error);
        },

        conversationChanged(data: any) {
            console.warn('conversationChanged', data);
            let flag = false;
            const map = {} as any;
            this.convs.forEach((item: any) => (map[item.type + item.conversationID] = item));
            data.infoList.forEach((item: any) => {
                const key = item.conversation.type + item.conversation.conversationID;
                if (!map[key]) {
                    this.convs.push(item.conversation);
                } else {
                    flag = true;
                    Object.assign(map[key], item.conversation);
                }
            });
            if (flag) this.convs = [...this.convs];
            this.convs.sort((a: any, b: any) => b.orderKey - a.orderKey);
        },

        setConversationNotificationStatus(status: number, id: string, type: number) {
            return zim.setConversationNotificationStatus(status, id, type).catch(on_error);
        },

        clearConversationUnreadMessageCount(convID: string, type: number) {
            return zim.clearConversationUnreadMessageCount(convID, type).catch(on_error);
        },

        queryHistoryMessage(convID: string, type: number, config: any) {
            config = {
                count: 1000,
                reverse: true,
                ...config,
            };
            return zim
                .queryHistoryMessage(convID, type, config)
                .then((res) => {
                    res.messageList = res.messageList.sort((a: any, b: any) => a.orderKey - b.orderKey);
                    this.msgList.length = 0;
                    this.msgList.push(...res.messageList);
                    return res;
                })
                .catch(on_error);
        },

        sendChatMessage(type: number, message: string, convID: string, isByte = false) {
            const typeMap = {
                0: 'sendPeerMessage',
                1: 'sendRoomMessage',
                2: 'sendGroupMessage',
            } as any;
            const fn = typeMap[type];
            const content = isByte
                ? Uint8Array.from(Array.from(unescape(encodeURIComponent(message))).map((c) => c.charCodeAt(0)))
                : message;
            if (!fn || !content.length) return Promise.reject();
            const msgObj = { message: content, type: isByte ? 2 : 1 };
            const pushConfig = isByte
                ? void 0
                : {
                      title: 'Received [Text] message from ' + convID,
                      content: message,
                      extendedData: '',
                  };
            // @ts-ignore
            return zim[fn](msgObj, convID, { priority: 2, pushConfig })
                .then(() => {
                    console.log(fn, { convID, msgObj });
                    return msgObj;
                })
                .catch((error: any) => {
                    console.warn(fn, { convID, msgObj, error });
                    on_error(error);
                    return msgObj;
                });
        },

        sendMediaMessage(message: any, convID: string, convType: number, progress: any) {
            const pushConfig =
                convType == 1
                    ? void 0
                    : {
                          title: 'Received [Media] message from ' + convID,
                          content: message.fileLocalPath?.name || message.fileDownloadUrl || 'Media File Name',
                          extendedData: '',
                      };
            return zim
                .sendMediaMessage(message, convID, convType, { priority: 2, pushConfig }, progress)
                .then(() => {
                    console.log('sendMediaMessage', { message, convID, convType });
                    return message;
                })
                .catch((error) => {
                    console.warn('sendMediaMessage', { message, convID, convType, error });
                    on_error(error);
                    return message;
                });
        },

        insertMessageToLocalDB(msg: any, convID: string, type: number, sender: string) {
            zim.insertMessageToLocalDB(msg, convID, type, sender).then((res) => {
                if (convID == this.convInfo.conversationID && type == this.convInfo.type) {
                    this.msgList.push(res.message);
                }
            });
        },

        createGroup(groupInfo: any, users: any, config = {} as any) {
            if (groupInfo.groupAvatarUrl) groupInfo.groupAvatarUrl = avatarPrefix + groupInfo.groupAvatarUrl;
            console.warn('createGroup groupInfo', groupInfo);
            return zim.createGroup(groupInfo, users, config).catch(on_error);
        },

        joinGroup(groupID: string) {
            return zim.joinGroup(groupID).catch(on_error);
        },

        setGroupAttributes(groupID: string, groupAttributes: Record<string, string>) {
            return zim.setGroupAttributes(groupAttributes, groupID).catch(on_error);
        },

        queryGroupAttributes(groupID: string, keys: any) {
            if (keys?.length) {
                return zim.queryGroupAttributes(keys, groupID).catch(this.on_error);
            }

            return zim.queryGroupAllAttributes(groupID).catch(this.on_error);
        },

        createRoom(roomInfo: any, roomAttr = {}) {
            const { roomID, roomName } = roomInfo;
            return zim.createRoom({ roomID, roomName }).catch(on_error);
        },

        joinRoom(roomID: string) {
            return zim.joinRoom(roomID).catch(on_error);
        },

        leaveRoom(roomID: string) {
            return zim.leaveRoom(roomID).catch(on_error);
        },

        setRoomAttributes(roomAttributes: Record<string, string>, roomID: string) {
            const config = {
                isForce: true,
                isUpdateOwner: true,
                isDeleteAfterOwnerLeft: true,
            };
            return zim.setRoomAttributes(roomAttributes, roomID, config).catch(on_error);
        },

        queryRoomAllAttributes(roomID: string) {
            return zim.queryRoomAllAttributes(roomID).catch(on_error);
        },

        getGroupList() {
            return zim
                .queryGroupList()
                .then((res) => {
                    this.groupList.length = 0;
                    this.groupList.push(...res.groupList);
                    return res;
                })
                .catch(on_error);
        },

        updateGroupName(groupID: string, groupName: string) {
            return zim.updateGroupName(groupName, groupID).catch(on_error);
        },

        updateGroupAvatarUrl(groupID: string, groupAvatarUrl: string) {
            groupAvatarUrl = avatarPrefix + groupAvatarUrl;
            return zim.updateGroupAvatarUrl(groupAvatarUrl, groupID).catch(on_error);
        },

        updateGroupNotice(groupID: string, groupNotice: string) {
            return zim.updateGroupNotice(groupNotice, groupID).catch(on_error);
        },

        transferGroupOwner(groupID: string, userID: string) {
            return zim.transferGroupOwner(userID, groupID).catch(on_error);
        },

        inviteUsersIntoGroup(groupID: string, userIDs: string[]) {
            return zim.inviteUsersIntoGroup(userIDs, groupID).catch(on_error);
        },

        kickGroupMembers(groupID: string, userIDs: string[]) {
            return zim.kickGroupMembers(userIDs, groupID).catch(on_error);
        },

        queryGroupMemberList(groupID = '', config: any = {}) {
            groupID = groupID || this.convInfo.conversationID;
            const nextFlag = 0;
            const _config = {
                nextFlag,
                count: 100,
                ...config,
            };
            return zim
                .queryGroupMemberList(groupID, _config)
                .then((res) => {
                    console.warn('queryGroupMemberList', res);
                    if (nextFlag == 0) this.memberList.length = 0;
                    this.memberList.push(...res.userList);

                    res.userList.forEach((item) => {
                        this.userMap[item.userID] = { ...item };
                    });
                    console.warn('userMap', JSON.stringify(this.userMap));

                    if (res.nextFlag) {
                        this.queryGroupMemberList(groupID, { nextFlag: res.nextFlag });
                    }
                })
                .catch(on_error);
        },

        queryGroupMemberCount(groupID = '') {
            groupID = groupID || this.convInfo.conversationID;
            return zim
                .queryGroupMemberCount(groupID)
                .then((res) => {
                    this.totalMemberCount = res.count;
                })
                .catch(on_error);
        },

        queryGroupInfo(groupID: string) {
            return zim.queryGroupInfo(groupID).catch(on_error);
        },

        deleteConversation(id: string, type: number, config?: any) {
            const _config = {
                isAlsoDeleteServerConversation: true,
                isAlsoDeleteLocalHistoryMessage: true,
                ...config,
            };
            return zim.deleteConversation(id, type, _config).catch(on_error);
        },

        leaveGroup(groupID: string) {
            return zim
                .leaveGroup(groupID)
                .then((res) => {
                    const index = this.groupList.findIndex((item: any) => item.groupID == groupID);
                    index !== -1 && this.groupList.splice(index, -1);
                    return res;
                })
                .catch(on_error);
        },

        dismissGroup(groupID: string) {
            return zim
                .dismissGroup(groupID)
                .then((res) => {
                    const index = this.groupList.findIndex((item: any) => item.groupID == groupID);
                    index !== -1 && this.groupList.splice(index, -1);
                    return res;
                })
                .catch(on_error);
        },

        queryRoomMember(roomID = '', config: any = {}) {
            roomID = roomID || this.convInfo.conversationID;
            const nextFlag = '';
            const _config = {
                nextFlag,
                count: 1000,
                ...config,
            };
            return zim
                .queryRoomMemberList(roomID, _config)
                .then((res) => {
                    if (!nextFlag) this.memberList.length = 0;
                    this.memberList.push(...res.memberList);
                    res.memberList.forEach((item) => {
                        this.userMap[item.userID] = { ...item };
                    });
                    if (res.nextFlag) {
                        this.queryRoomMember(roomID, { nextFlag: res.nextFlag });
                    }
                })
                .catch(on_error);
        },

        queryRoomOnlineMemberCount(roomID: string) {
            return zim
                .queryRoomOnlineMemberCount(roomID)
                .then((res) => {
                    this.totalMemberCount = res.count;
                })
                .catch(on_error);
        },

        queryAllGroupInfo(id: string) {
            this.queryGroupInfo(id).then((res: any) => {
                this.convInfo.conversationName = res.groupInfo.baseInfo.groupName;
                this.convInfo.notice = res.groupInfo.groupNotice;
                this.convInfo.notificationStatus = res.groupInfo.notificationStatus || 0;
            });
            this.queryGroupMemberList();
            this.queryGroupAttributes(id).then((res: any) => {
                this.convInfo.note = res.groupAttributes.remark;
            });
        },
    },
});

const on_error = (error: any) => {
    console.error(error);
    const zimStore = store();
    if (error.code == 6000121 || error.code == 6000111) {
        zimStore.logout(false);
    }
    ElNotification({
        title: error.code,
        message: error.message,
        type: 'error',
    });
    return error;
};
// @ts-ignore
window.$store = store;

export default store;
