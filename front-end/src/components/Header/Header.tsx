import { useDeferredValue, useEffect, useRef, useState, useContext } from "react";
import "./HeaderStyle.css";
import { useNavigate } from "react-router-dom";
import { useConnectedUser } from "../../context/ConnectedContext";
import useClickOutside from "../../utils/hooks/useClickOutside";
import useFetch from "../../utils/hooks/useFetch";
import { LoginType, Tokens } from "../../types";
import StaticHeaderHome from "./StaticHeader/StaticHeader";
import DynamicHeader from "./DynamicHeader/DynamicHeader";
import { getCookie, getTokensFromCookie } from "../../utils/utils";


const Header = (props: LoginType) => {
  return (
    <>
      {!props.isConnected && <StaticHeaderHome logInFunc={props.logInFunc} />  }

      {props.isConnected && <DynamicHeader setIsConnected={props.setIsConnected} />}
    </>
  );
};

export default Header;
