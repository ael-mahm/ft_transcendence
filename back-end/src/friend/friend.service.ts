/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";


@Injectable()
export class FriendService{

    private logger = new Logger();

    constructor(private readonly prisma: PrismaService){}


    async getNumberOfFriends(userId: string) : Promise<number>{
    
        try {


            const numberOfFriends = await this.prisma.friendship.count({
                where: {
                    OR: [
                        {userOne: userId},
                        {userTwo: userId}
                    ]
                }
            });
            return numberOfFriends;
        }
        catch (error) {
            throw new BadRequestException('bad request, number of friends');
        }
    }

    async getIsFriend(userId: string, friendId: string): Promise<{ relationShip: string }> {

        const res = await this.prisma.friendship.findFirst({where: { 
            OR: [
                { userOne: userId, userTwo: friendId},
                { userOne: friendId, userTwo: userId },
            ]
         }})

        if (res) {
            return {
                relationShip: "friend"
            }
        } 

        const blockUsers = await this.prisma.blockedUsers.findFirst({where: { 
            OR: [
                { blockedId: userId, blockingId: friendId},
                { blockedId: friendId, blockingId: userId},
            ]
         }})

         if (blockUsers) {
            return {
                relationShip: "blocked"
            }
         }

        return { relationShip: "isnotfriend" }

    }

    async getAllFriends(userId: string) {
        const userFriends = await this.prisma.friendship.findMany({
            where: {
                OR: [
                    { userOne: userId },
                    { userTwo: userId },
                ],
            },
        });

        const friendIds = userFriends.map(friendship => {
            return friendship.userOne === userId ? friendship.userTwo : friendship.userOne;
        });

        const friends = await this.prisma.user.findMany({
            where: {
                id: {
                    in: friendIds,
                },
            },
            select: {
                id: true,
                Status: true,
                username: true,
                avatarUrl:true
            },
        });

        const newFriends = friends.map(item => ({
            id: item.id,
            name: item.username,
            status: item.Status,
            images: [
                item.avatarUrl
            ]
        }))

        return {
            friends: [
                ...newFriends
            ]
        };
    }

    async blockFriend(userId: string, friendId: string): Promise<boolean> {
        try {
                const friendship = await this.prisma.friendship.findFirst({
                    where: {
                        OR: [
                            { userOne: userId, userTwo: friendId },
                            { userOne: friendId, userTwo: userId }, 
                        ],
                    },
                });
                if (!friendship) {
                    throw new Error('Friendship not found.');
                }
                await this.prisma.friendship.delete({ where: { id: friendship.id } });
                await this.prisma.blockedUsers.create({
                    data: {
                        blockingId: userId,
                        blockedId: friendId,
                    },
                });
                return true;
        } catch (error) {
                throw new BadRequestException('Failed to block user.');
        }
    }
    
    async addFriend(userId: string, friendId: string) {
        try {
            const alreadyFreind = await this.prisma.friendship.findFirst({
                where: {
                    OR: [
                        {userOne: userId, userTwo: friendId},
                        {userOne: friendId, userTwo: userId}
                    ]
                }
            });

            if (alreadyFreind) {
                throw new Error('Already freind....');
            }
            await this.prisma.friendship.create({
                data: {
                    userOne: userId,
                    userTwo: friendId,
                },
            });
        } catch (error) {
            throw { error: error.message };
        }
    }
}