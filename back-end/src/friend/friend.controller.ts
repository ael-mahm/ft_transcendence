/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { FriendService } from "./friend.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AccessGuard, LoginGuard } from "src/auth/guard";
import { GetUser } from "src/decorators";



@UseGuards(AccessGuard, LoginGuard)
@Controller('friend')
export class FriendController{
    constructor(private readonly friendService: FriendService,
        private eventEmitter: EventEmitter2) {}

    @Get('numberoffriends/:userId')
    async getNumberOfFriends(@Param('userId') userId: string) {
        try {
            const number = await this.friendService.getNumberOfFriends(userId)
            return {number: number}
        } catch (error) {
            return error.response;
        }
    }

    @Get('all')
    async getAllFriends(@GetUser('id') userId: string) {
        return await this.friendService.getAllFriends(userId);
    }

    @Get("isfriend/:friendId")
    async getIsFriend(@GetUser("id") userId: string, @Param("friendId") friendId: string): Promise<{ relationShip: string }> {
        return this.friendService.getIsFriend(userId, friendId)
    }

    @Post('add/:friendId')
    async addFriend(@GetUser('id') userId: string, @Param('friendId') friendId: string) {
        try {
            await this.friendService.addFriend(userId, friendId);
            this.eventEmitter.emit('addFriend', {userId, friendId});
            return {statusCode: 200};
        } catch (error) {
            return {statusCode: 400};
        }
    }

    @Post('block/:friendId')
    async blockFriend(@GetUser('id') userId: string, @Param('friendId') friendId: string) {
        try {
            await this.friendService.blockFriend(userId, friendId);
            this.eventEmitter.emit('blockFriend', {userId, friendId});
            return {statusCode: undefined}
        } catch (error) {
            return error.response;
        }
    }
}