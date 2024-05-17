import { Injectable, InternalServerErrorException, Logger, NotAcceptableException, NotFoundException } from '@nestjs/common';
import { HistoryGame, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { HistoryGameReturnedType, HistoryGameType, Player } from './dto';
import { LeaderBoardType } from 'src/types/LeaderBoardType.type';

@Injectable()
export class HistoryGameService {

    private logger = new Logger(HistoryGameService.name);

    constructor (
        private prisma: PrismaService
    ) {}

    async leaderboard (): Promise<LeaderBoardType []> {
        let board: LeaderBoardType [] = [];

        // get all levels of users in db sorted the level
        const users: User[] = await this.prisma.user.findMany({
            orderBy: {
                levelGame: 'desc'
            }
        })

        // loop through all users
        board = await Promise.all(users.map( async (user: User) => {

            // get number of winned and lost games
            const { numberWinnedLosed } = await this.numberGameLosed(user.id);
            const { numberWinnedGame } = await this.numberGameWinned(user.id);

            // get the total number of games played
            const numberOfgames: number =  numberWinnedLosed + numberWinnedGame;

            // init data for leader board
            const lBoard: LeaderBoardType = {
                id: user.id,
                username: user.fullName,
                avatarUrl: user.avatarUrl,
                numberGamesPlayed: numberOfgames,
                level: user.levelGame,
            }

            return lBoard;
        }))

        return board;
    }

    async createHistoryGame(datahis: HistoryGameType) {

        // Note: when this method is called u need to make sure id winner is oned to his score 
        // because this method dose not know if that score is oned to that user

        try {

            console.log('datahis:', datahis);
            // need to check if the users is is exist for the winner and loser 
            const userWinner = await this.prisma.user.findFirst({ where: { id: datahis.winnerId }})

            if (!userWinner) {
                throw new NotFoundException();
            }

            const userLoser = await this.prisma.user.findFirst({ where: { id: datahis.loserId }})

            if (!userLoser) {
                throw new NotFoundException();
            }

            // make sure the score's are positif numbers 
            if (datahis.scoreWinner < 0 || datahis.scoreLoser < 0 ) {
                throw new NotAcceptableException();
            }

            // Check if the score is already in db
            const oldGame = await this.prisma.historyGame.findFirst({
                where: { startTimeGame: datahis.startTimeGame }
            });

            if (!oldGame) {
                // create the history game 
                const hGame = await this.prisma.historyGame.create({ 
                    data: {
                        loserId: datahis.loserId,
                        startTimeGame: datahis.startTimeGame,
                        scoreWinner: datahis.scoreWinner,
                        scoreLoser: datahis.scoreLoser,
                        winnerId: datahis.winnerId,
                    }
                })
                
                // update the level for the winner
                await this.logiqueLevel(hGame.winnerId);
            }
            



        } catch (error) {
            this.logger.error(error);
            throw new InternalServerErrorException();
        }
    }

    async getGamesByIdUser(userId: string): Promise< HistoryGameReturnedType [] > {


        try {
            
            // get the player by id
            const userOwner = await this.prisma.user.findFirst({ where: { id: userId } });

            // check if the player exists
            if (!userOwner) {
                throw new NotFoundException();    
            }

            // init the array of history games
            const hgames: HistoryGameReturnedType [] = [];

            // get the games ( win Or lose ) one
            const hisGamgeFromTable: HistoryGame[] = await this.prisma.historyGame.findMany({ 
                where: { 
                    OR: [
                        { winnerId: userId },
                        { loserId: userId }
                    ] 
                }
            });

            // loop through the history games and create data to store in array and return it
            await Promise.all(
                hisGamgeFromTable.map( async (hisGame) => {

                    let player1: Player;
                    let player2: Player;
    
                    // make sure allways the player1 is the owner one
                    if (hisGame.winnerId === userId) {
                        player1 = {
                            id: hisGame.winnerId,
                            username: userOwner.fullName,
                            score: hisGame.scoreWinner,
                        }
    
                        player2 = await this.initPlayerInfo(hisGame.loserId, hisGame.scoreLoser);
                    
                    } else if (hisGame.loserId === userId) {
                    
                        player1 = {
                            id: hisGame.winnerId,
                            username: userOwner.fullName,
                            score: hisGame.scoreLoser,
                        }
                    
                        player2 = await this.initPlayerInfo(hisGame.winnerId, hisGame.scoreWinner);
                    
                    }
    
                    const hgame: HistoryGameReturnedType = {
                        player1,
                        player2,
                        timestamp: hisGame.createdAt,
                    }
    
                    hgames.push(hgame);
                })
            );

            return hgames;

        } catch (error) {
            this.logger.error(error);
            throw new InternalServerErrorException();
        }

    }

    private async initPlayerInfo(userId: string, score: number): Promise< Player > {
        
        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            throw new NotFoundException();
        }

        const player: Player = {
            id: user.id,
            username: user.fullName,
            score: score,
        }

        return player;
    }


    async numberGameWinned(userId: string): Promise< { numberWinnedGame: number } > {

        const user = await this.prisma.user.findFirst({ where: { id: userId } });

        if (!user) {
            throw new NotFoundException();
        }

        const numberWinnedGame = await this.prisma.historyGame.count({ where: { winnerId: userId } });

        return {
            numberWinnedGame
        }
    }

    async numberGameLosed(userId: string): Promise< { numberWinnedLosed: number } > {

        // check if the id exist as a user
        const user = await this.prisma.user.findFirst({ where: { id: userId } });

        if (!user) {
            throw new NotFoundException();
        }

        const numberWinnedLosed = await this.prisma.historyGame.count({ where: { loserId: userId } });

        return {
            numberWinnedLosed
        }
    }

    
    private async logiqueLevel (userId: string) {

        const gamesWinned: number = await this.prisma.historyGame.count({ where: { winnerId: userId } });

        this.logger.debug(`Games Winned: ${gamesWinned}`);

        const LevelWin = this.getLevel(gamesWinned);

        this.logger.debug(`LEVEL: ${LevelWin}`);

        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                levelGame: LevelWin
            }
        })

        if (!user) {
            throw new NotFoundException();
        }
    }


    private getLevel(numberGames: number) {
        if (numberGames === 0) {
            return 0;
        } else if (numberGames > 0 && numberGames <= 10) {
            return 1;
        } else if (numberGames > 10 && numberGames <= 20) {
            return 2;
        } else if (numberGames > 20 && numberGames <= 30) {
            return 3;
        } else if (numberGames > 30 && numberGames <= 40) {
            return 4;
        } else if (numberGames > 40 && numberGames <= 50) {
            return 5;
        } else if (numberGames > 50 && numberGames <= 60) {
            return 6;
        } else if (numberGames > 60 && numberGames <= 70) {
            return 7;
        } else if (numberGames > 70 && numberGames <= 80) {
            return 8;
        } else if (numberGames > 80 && numberGames <= 90) {
            return 9;
        } else {
            return 10;
        }
    }


}
