/* eslint-disable prettier/prettier */
import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateMessageDto } from "./dto/create-message.dto";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ConversationDto } from "./dto/conversation.dto";

@Injectable()
export class MessagesService {
    constructor (private prisma: PrismaService) {}

    async createMessage(createMessageDto: CreateMessageDto) {
        return this.prisma.directMessage.create({
            data: {
                message: createMessageDto.message,
                senderId: createMessageDto.senderId,
                receiverId: createMessageDto.receiverId,
                readed: false
            }
        });
    }

    async isBlocked(blockingId: string, blockedId: string): Promise<boolean> {
        const isBlocked = await this.prisma.blockedUsers.findFirst({
            where: {
                OR: [
                    { blockingId, blockedId },
                    { blockingId: blockedId, blockedId: blockingId },
                ],
            },
        });    
        return !!isBlocked;
    }

    

async getConversation(userId: string): Promise<ConversationDto[]> {
    const friends = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { userOne: userId },
          { userTwo: userId },
        ],
      },
    });
  
    const conversations: ConversationDto[] = await Promise.all(
      friends.map(async (friendship) => {
        const otherUserId = friendship.userOne === userId ? friendship.userTwo : friendship.userOne;
        const otherUser = await this.prisma.user.findUnique({
          where: { id: otherUserId },
          select: {
            id: true,
            email: true,
            username: true,
            avatarUrl: true,
            Status: true,
          },
        });
  
        if (!otherUser) {
          throw new Error(`User with id ${otherUserId} not found`);
        }
  
        const conversation = await this.prisma.directMessage.findMany({
          where: {
            OR: [
              { senderId: userId, receiverId: otherUserId },
              { senderId: otherUserId, receiverId: userId },
            ],
          },
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            sender: true,
            receiver: true,
          },
        });
  
        const unreadCount = conversation.filter((message) => message.receiverId === userId && !message.readed).length;
  
        const lastMessage = conversation.length > 0 ? {
          id: conversation[0].id,
          createdAt: conversation[0].createdAt,
          message: conversation[0].message,
        } : null;
  
        return {
          user: {
            id: otherUser.id,
            email: otherUser.email,
            username: otherUser.username,
            avatarUrl: otherUser.avatarUrl,
            status: otherUser.Status,
          },
          unreadCount,
          lastMessage,
        };
      })
    );
  
    return conversations;
  }

    async getMessagesBetweenUsers(userId1: string, userId2: string): Promise<any> {
        const messages = await this.prisma.directMessage.findMany({
            where: {
                OR: [
                    { AND: [{ senderId: userId1 }, { receiverId: userId2 }] },
                    { AND: [{ senderId: userId2 }, { receiverId: userId1 }] },
                ],
            },
            orderBy: {
                createdAt: 'asc',
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                        Status: true,
                    },
                },
                receiver: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                        Status: true,
                    },
                },
            },
        });
    
        const [user2, user1] = await Promise.all([
            this.prisma.user.findUnique({
                where: {
                    id: userId2,
                },
                select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                    Status: true,
                },
            }),
            this.prisma.user.findUnique({
                where: {
                    id: userId1,
                },
                select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                    Status: true,
                },
            }),
        ]);
    
        const formattedMessages: any[] = messages.map((message) => {
            const isSender = message.senderId === userId1;
            const user = isSender ? user1 : user2;
            const otherUser = isSender ? user2 : user1;
    
            return {
                userType: isSender ? 'sender' : 'receiver',
                username: user.username,
                otherUsername: otherUser.username,
                timestamp: message.createdAt,
                message: message.message,
                image: user.avatarUrl,
                otherImage: otherUser.avatarUrl,
                status: otherUser.Status.toString().toLowerCase(),
            };
        });

        const haha = {
            conversationInfos: {
                    type: 'person',
                    username: user2.username,
                    status :user2.Status,
                    id:user2.id,
                    images: [user2.avatarUrl]
            },
            chatMessages: formattedMessages
        }
    
        return haha;
    }
    
    
    async getImageByUserId(userId: string): Promise<string | null> {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                avatarUrl: true,
            },
        });
    
        if (user) {
            return user.avatarUrl || null;
        } else {
            return null;
        }
    }    
    
}