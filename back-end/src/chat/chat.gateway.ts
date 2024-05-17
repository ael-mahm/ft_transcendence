/* eslint-disable prettier/prettier */
import { BadRequestException, Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { CreateMessageDto } from './DirectMessages/dto/create-message.dto';
import { MessagesService } from './DirectMessages/messages.service';
import { ChatService } from './chat.service';
import { SharedService } from './shared/shared.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as jwt from 'jsonwebtoken';
import { RoomsService } from './rooms/rooms.service';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: '/chat'
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private             logger = new Logger(ChatGateway.name);
    @WebSocketServer()  server: Server;

    constructor (
        private messageService: MessagesService,
        private chatService: ChatService,
        private roomsService: RoomsService,
        private prisma: PrismaService,
    ) {}

    handleDisconnect(client: any) {
        const accessToken = client.handshake.query.access_token as string;
        try {
        if (accessToken) {
            const decodedToken = jwt.verify(accessToken, process.env.SECRET_JWT_TOKEN);
            const userId: string = (decodedToken as any).sub;
            this.chatService.removeUserSocket(userId, client.id);
        }
    } catch (error) {
        console.error('Error decoding access token:', error.message);
    }
    }

    handleConnection(client: any) {
        const accessToken = client.handshake.query.access_token as string;
        try {
            // Decode the access token to get userId
            if (accessToken) {
                const decodedToken = jwt.verify(accessToken, process.env.SECRET_JWT_TOKEN);
                const userId: string = (decodedToken as any).sub;
                this.chatService.addUserSocket(userId, client.id);
            }
        } catch (error) {
            console.error('Error decoding access token:', error.message);
        }
    }

    private async isUserMuted(senderId: string, roomId: string): Promise<boolean> {
        const mutedUser = await this.roomsService.checkMutedUser(senderId, roomId);
        return !!mutedUser;
    }

    private isSenderMutedInRoom(senderId: string, roomId: string): boolean {
        const roomMutes = SharedService.mutedUsers.get(senderId);
        if (roomMutes && roomMutes.has(roomId)) {
            return true;
        }
        return false;
    }

    @SubscribeMessage('sendMESSAGE')
    async createMessage(client: Socket, createMessageDto: CreateMessageDto) {
        try 
        {
            if (createMessageDto.isRoom === false) {
                    const isBlocked = await this.messageService.isBlocked(createMessageDto.receiverId, createMessageDto.senderId);
                    const senderImage = await this.messageService.getImageByUserId(createMessageDto.senderId);
                    if (isBlocked) {
                        this.server.to(client.id).emit('newMESSAGE_ERROR', { message: 'The receiver has blocked you.' });
                        return;
                    }
                    const message = await this.messageService.createMessage(createMessageDto);
                    const recvSockets = SharedService.UsersSockets.get( createMessageDto.receiverId );
                    let destUserSockets = [ ...SharedService.UsersSockets.get(createMessageDto.senderId), ];
                    if (recvSockets)
                        destUserSockets = [...destUserSockets, ...recvSockets];
                    destUserSockets.forEach((socket) => {
                    this.server.to(socket).emit('newMESSAGE', { ...createMessageDto, senderImage, timestamp: message.createdAt });
                });
            } else {
                const room = await this.roomsService.findRoomById(createMessageDto.receiverId);
                const senderImage = await this.messageService.getImageByUserId(createMessageDto.senderId);
                if (!room) {
                    this.server.to(client.id).emit('newMESSAGE_ERROR', { message: `Room with ID ${createMessageDto.receiverId} not found`});
                    return;
                }

                // check in map not db
                if (this.isSenderMutedInRoom(createMessageDto.senderId, createMessageDto.receiverId)) {
                    this.server.to(client.id).emit('newMESSAGE_ERROR', { message: `You are muted in this room!`});
                    return;
                }
                const isSenderMuted = await this.isUserMuted(createMessageDto.senderId, createMessageDto.receiverId);

                if (isSenderMuted) return;
                const isSenderBanned = await this.roomsService.isUserBanned(createMessageDto.senderId, createMessageDto.receiverId);
                if (isSenderBanned) {
                        this.server.to(client.id).emit('newMESSAGE_ERROR', { message: `You are Banned in this room!`});
                        return;
                }
                const banedUsers = await this.roomsService.getBanedUsers(createMessageDto.receiverId);
                const banedUserIds = banedUsers.map((banedUser) => banedUser.userId);
                const banedUserSockets = [];
                banedUserIds.forEach((userId) => {
                    const userSockets = SharedService.UsersSockets.get(userId);
                    if (userSockets) {
                        banedUserSockets.push(...userSockets);
                    }
                });
                
                const message = await this.roomsService.createMessage(createMessageDto);
                const targetMembersOfRoom = await this.roomsService.getAllMembersOfRoom(createMessageDto.receiverId);
                targetMembersOfRoom?.forEach((user) => {
                    if (!banedUserIds.includes(user.userId)) {
                        const userSockets = SharedService.UsersSockets.get(user.userId);
                        userSockets?.forEach((socket) => {
                            this.server.to(socket).emit('newMESSAGE', {...createMessageDto, senderImage, timestamp: message.createdAt });
                        });
                    }
                });
            }
        }
        catch (error){
            this.logger.error('failure in message creation');
            this.server.to(client.id).emit('newMESSAGE_ERROR', { message: 'server: there is an error.' });
        }
    }

    @OnEvent('addRoom')
    async addRoom( {newRoom, ownerID, images}
    ) {
        const recv = SharedService.UsersSockets.get(ownerID);
        recv?.forEach((socket) => {
            this.server.to(socket).emit('newRoom', {
                    id: newRoom.id,
                    roomName: newRoom.roomName,
                    members: 1,
                    group: {
                        name: newRoom.roomName,
                        images: images,
                        lastMessage: 'start conversation',
                    },
            });
        });
    }

    @OnEvent('deleteRoom')
    async deleteRoom( roomId : string, membersIds: string[]
    ) {
        membersIds.forEach((userId) => {
            const userSockets = SharedService.UsersSockets.get(userId);
    
            if (userSockets) {
                userSockets.forEach((socket) => {
                    this.server.to(socket).emit('leaveRoom', {eventName: '',
                        payload: {
                            userId: userId,
                            roomId: roomId
                        }}
                        );
                });
            }
        });
    }

    @SubscribeMessage('leaveROOM')
    async leaveRoom(client: Socket, data: { userId: string, roomId: string }): Promise<void> {
        const { userId, roomId } = data;
        const isOwner = await this.roomsService.isRoomOwner(userId, roomId);
        const isAdmin = await this.roomsService.isUserAdmin(userId, roomId);
        
        await this.roomsService.removeUserFromRoom(userId, roomId);

        if (isOwner) {
            await this.roomsService.assignNewOwner(userId, roomId);
        }
        
        if (isAdmin) {
            await this.roomsService.removeUserFromAdmins(userId, roomId);
        }

        await this.roomsService.removeUserFromBannedUsers(userId, roomId);
        await this.roomsService.removeUserFromMutedUsers(userId, roomId);

        const remainingMembers = await this.roomsService.getRoomMembersCount(roomId);

        if (remainingMembers === 0) {
            await this.roomsService.deleteRoom(roomId);
        }

        const leftUserSockets = SharedService.UsersSockets.get(data.userId);
        leftUserSockets?.forEach((socket) => {
            this.server.to(socket).emit('youLeftROOM');
        });
    }

    private async muteUser(userId: string, roomId: string, duration: number): Promise<void> {
        if (!SharedService.mutedUsers.has(userId)) {
            SharedService.mutedUsers.set(userId, new Map());
        }

        const userRooms = SharedService.mutedUsers.get(userId);
        const userUnmuteTimers = userRooms.get(roomId);

        if (userUnmuteTimers) {
            clearTimeout(userUnmuteTimers);
        }

        const unmuteTimer = setTimeout(() => {
            this.unmuteUser(userId, roomId);
        }, duration * 60 * 1000);

        userRooms.set(roomId, unmuteTimer);
    }

    private async unmuteUser(userId: string, roomId: string): Promise<void> {
        const unMutedUserSockets = SharedService.UsersSockets.get(userId);
        unMutedUserSockets?.forEach((socket) => {
            this.server.to(socket).emit('userUnmuted', { message: 'Now you are unmuted.', roomId });
        });
        const userRooms = SharedService.mutedUsers.get(userId);
        if (userRooms && userRooms.has(roomId)) {
            clearTimeout(userRooms.get(roomId));
            userRooms.delete(roomId);
        }
    }

    @SubscribeMessage('muteUSER')
    async handleMuteUser(client: Socket, data: { userId: string, roomId: string, duration : number, adminId: string }): Promise<void> {
        // eslint-disable-next-line prefer-const
        let { userId, roomId, duration, adminId } = data;

        duration = 5;
        const result = await this.roomsService.isUserAdmin(adminId, roomId);
        if (!result) {
            client.emit('muteUserError', { message: 'You are not authorized to mute users in this room.' });
            return;
        }

        const isOwner = await this.roomsService.isRoomOwner(userId, roomId);
        if (isOwner) {
            client.emit('muteUserError', { message: 'You are not authorized to mute the owner of room.' });
            return;
        }

        this.muteUser(userId, roomId, duration)
            .then(() => {
                const mutedUserSockets = SharedService.UsersSockets.get(userId);
                mutedUserSockets?.forEach((socket) => {
                    this.server.to(socket).emit('youMuted', { message: 'Now you are muted.', roomId });
                });
                client.emit('userMuted', { message: `User is muted for ${duration} minutes in room ${roomId}.` });
            })
            .catch((error) => {
                console.error('Error muting user:', error.message);
                client.emit('muteUserError', { message: 'Failed to mute user.' });
            });
    }


        async  getUserInfo(userId: string): Promise<any> {
            // Get user data
            const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                Status: true,
                username: true,
                avatarUrl: true,
            },
            });
        
            if (!user) {
                return null;
            }
        
            const userInfo: any = {
                id: user.id,
                status: user.Status,
                name: user.username,
                avatarUrl: user.avatarUrl,
            };
        
            return userInfo;
        }

    @OnEvent('addFriend')
    async addFriend({userId, friendId}): Promise<any> {
        try {
            const infoUser = await this.getUserInfo(userId);
            const recvSockets = SharedService.UsersSockets.get( friendId );
            recvSockets.forEach((socket) => {
                this.server.to(socket).emit('newFriend', { 
                    id: userId,
                    status: infoUser.status,
                    friend: {
                        name: infoUser.name,
                        image: infoUser.avatarUrl,
                        message: 'start conversation',
                        notifications: 0,
                    },
                    notifications: 0
                });
            });
        } catch (error) {
            throw new BadRequestException('Already friend');
        }
    }

    @OnEvent('blockFriend')
    async blockFriend({userId, friendId}): Promise<any> {
        try {
            const infoUser = await this.getUserInfo(userId);
            const recvSockets = SharedService.UsersSockets.get( friendId );
            recvSockets?.forEach((socket) => {
                this.server.to(socket).emit('removeFriend', { 
                    id: userId,
                    status: infoUser.status,
                    friend: {
                        name: infoUser.name,
                        image: infoUser.avatarUrl,
                        message: 'start conversation',
                        notifications: 0,
                    },
                    notifications: 0
                });
            });

            const destUserSockets = SharedService.UsersSockets.get(userId);
            destUserSockets?.forEach((socket) => {
                this.server.to(socket).emit('removeFriend', { id: friendId });
            });
        } catch (error) {
            throw new BadRequestException('Already friend');
        }
    }


    @OnEvent('kickMember')
    async kickMember({roomId, userId}): Promise<any> {
        try {
            const destUserSockets = SharedService.UsersSockets.get(userId);
            destUserSockets?.forEach((socket) => {
                this.server.to(socket).emit('removeRoom', { id: roomId });
            });
        } catch (error) {
            throw new BadRequestException('Already friend');
        }
    }

    @OnEvent('roomUpdate')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async roomUpdate({roomId, userId, eventName, adminId}): Promise<any> {
        try {
            if (eventName === 'leaveRoom') {
                const recv = userId ? SharedService.UsersSockets.get(userId) : undefined;
                recv?.forEach((socket) => {
                    this.server.to(socket).emit('leaveRoom', {eventName: eventName,
                        payload: {
                            userId: userId,
                            roomId: roomId
                        }});
                });
            }
        } catch (error) {
            throw new BadRequestException('Already friend');
        }
    }

    @OnEvent('muteMember')
    async muteMember({roomId, userMuted}): Promise<any> {
        try {
            const destUserSockets = SharedService.UsersSockets.get(userMuted);
            destUserSockets?.forEach((socket) => {
                this.server.to(socket).emit('youAreMuted', { roomId: roomId });
            });
        } catch (error) {
            throw new BadRequestException('Already friend');
        }
    }

    @OnEvent('unMuteMember')
    async unMuteMember({roomId, userId}): Promise<any> {
        try {
            const destUserSockets = SharedService.UsersSockets.get(userId);
            destUserSockets?.forEach((socket) => {
                this.server.to(socket).emit('youAreUnMuted', { roomId: roomId });
            });
        } catch (error) {
            throw new BadRequestException('Already friend');
        }
    }

    @OnEvent('sendRequestGame')
    async sendRequestGame(data: any): Promise<any> {
        try {
            const destUserSockets = SharedService.UsersSockets.get(data?.userId);
            destUserSockets?.forEach((socket) => {
                this.server.to(socket).emit('requestGame', {username: data?.username, userId: data?.id});
            });
        } catch (error) {
            throw new BadRequestException('Already friend');
        }
    }
}