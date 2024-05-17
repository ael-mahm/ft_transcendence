import React, { useEffect, useRef, useState } from 'react'

import "./GamesHistoryStyle.css"
import { HistoryGameReturnedType, Tokens, UserType } from '../../../types';
import GameHistoryItem from './GameHistoryItem/GameHistoryItem';

interface GamesHistory {
  dataHisGame: HistoryGameReturnedType [] | []
} 

function GamesHistory(props: GamesHistory) {
    return (
      <table
        className="display"
        style={{ width: "100%" }}
      >
        <thead>
          <tr>
            <th>Player 1</th>
            <th>Player 1 Score</th>
            <th>Player 2 Score</th>
            <th>Player 2</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {props.dataHisGame?.length !== 0 &&
            props.dataHisGame?.map((gameLog: HistoryGameReturnedType, index: number) => {
              const key = `game-${index}`;
              return <GameHistoryItem key={index} player1={gameLog.player1} player2={gameLog.player2} timestamp={gameLog.timestamp} />;
            })}
        </tbody>
      </table>
    );
}

export default GamesHistory
