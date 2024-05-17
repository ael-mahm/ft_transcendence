import React, { useEffect, useState } from 'react'
import "./ProfileAchievementsStyle.css"
import ProfileAchievement from './ProfileAchievement/ProfileAchievement';
import { getNumberOfWinnedGames, getTokensFromCookie, getUserById, getUserInfo } from '../../../utils/utils';
import { Tokens, UserType } from '../../../types';
import { useNavigate, useParams } from 'react-router-dom';
import { useConnectedUser } from '../../../context/ConnectedContext';

interface ProfileAchievementsType {
  numberGameWinned: number;
} 

function ProfileAchievements(props: ProfileAchievementsType) {

    const levels = [1, 2, 3, 4, 5, 6, 7, 20];
    const levelsLength = levels.length;
  return (
    <div className="profile-achievements">
      {levels.map((level, index) => {
        const stage: number = index + 1;
        let isActive: boolean = false;
        if (props.numberGameWinned >= level) {
          isActive = true;
        }
        const title: string =
          levelsLength - 1 === index ? `${level}+` : `${level} match`;
        return (
          <ProfileAchievement
            key={stage}
            stage={stage}
            title={title}
            isActive={isActive}
          />
        );
      })}
    </div>
  )
}

export default ProfileAchievements
