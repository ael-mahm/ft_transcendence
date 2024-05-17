import React, { useContext, useEffect, useState } from 'react'
import "./ProfileUserInfosStyle.css"
import { UserType } from '../../../types';
import Spinner from '../../../components/Spinner/Spinner';
import { getTokensFromCookie, prepareUrl } from '../../../utils/utils';
import { getNumberGamePlayedByUserId, getNumberOfFriends } from '../../../utils/utils';

interface UserInfoType {
  userData: UserType | null,
  numberGamePlayed: number,
  numberFrined: number,
  personal: boolean
}

function ProfileUserInfos(props: UserInfoType) {

  return (
    <>
    { props.userData ? (
      <div className="profile-user-infos">

        <div className="profile-user-image">
          <img src={ prepareUrl("") + props.userData?.avatarUrl} alt="user image" />
        </div>

        <div className="profile-user-description">
          <div className="profile-user-fullname">{props.userData?.fullName}</div>
          <p className="profile-user-username">{props.userData?.username}</p>
          {props.personal && (<p className="profile-user-status">{props.userData?.Status}</p>)}
        </div>

        <div className="profile-user-stats">
          <div className="stats-infos" id="friends">
            <div className="stats-number">'▮'</div>
            <p className="stats-title">Friends</p>
          </div>
          <div className="stats-infos" id="played-games">
            <div className="stats-number">{props.numberGamePlayed}</div>
            <p className="stats-title">Winned games</p>
          </div>
          <div className="stats-infos" id="level">
            <div className="stats-number">{props.userData?.levelGame}</div>
            <p className="stats-title">Level</p>
          </div>
        </div>
      </div>

    ) : (
      <Spinner />
    )

    }
    </>
  )
}

export default ProfileUserInfos
