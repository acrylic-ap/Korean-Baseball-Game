"use client";
import { rtdb } from "@/lib/client";
import {
  onValue,
  push,
  ref,
  runTransaction,
  set,
  serverTimestamp,
  onDisconnect,
} from "firebase/database";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { isCreateOpenAtom, isNicknameOpenAtom } from "../atom/modalAtom";
import { RoomCreateModal } from "./components/RoomCreateModal";
import { UnavailableSpectator } from "@/public/svg/LobbySVG";
import { ChangeNicknameModal } from "./components/ChangeNicknameModal";
import { nicknameAtom } from "../atom/lobbyAtom";
import { IPlayer } from "../atom/gameAtom";

/* --- Styles --- */
const LobbyContainer = styled.div`
  width: 100%;
  height: 100%;
`;
const Header = styled.header`
  width: 100%;
  height: 10%;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;
const Title = styled.p`
  margin-left: 20px;
  font-size: 23pt;
  font-weight: 600;
`;
const UserNickname = styled.div`
  margin-right: 30px;
  font-size: 14pt;
  color: #ccc;
  strong {
    color: #fff;
    margin-left: 5px;
  }
`;
const Section = styled.section`
  width: 100%;
  height: 90%;
`;
const RoomContainer = styled.div`
  margin-left: 20px;
  width: 90%;
  height: 90%;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-content: flex-start;
`;

const Room = styled.div`
  position: relative;

  background-color: rgb(39, 39, 39);

  width: 47%;
  height: 10%;

  margin: 5px;

  border-radius: 10px;

  box-sizing: border-box;

  display: flex;
  align-items: center;

  cursor: pointer;

  transition: transform 0.1s;

  &:hover {
    background-color: rgb(50, 50, 50);
    transform: scale(1.02);
  }
`;

const MakeRoom = styled(Room)`
  justify-content: center;
  border: 1px solid #555;
`;

const RoomNumber = styled.p`
  font-size: 19pt;
  margin: 15px;
`;
const RoomInfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;
const RoomTitle = styled.p`
  font-size: 15pt;
  margin: 0;
`;
const HostInfo = styled.p`
  font-size: 9pt;
  color: #888;
  margin: 0;
`;
const RoomConfig = styled.p`
  position: absolute;
  right: 15px;
  bottom: 7px;
  font-size: 11pt;

  display: flex;
  align-items: flex-end;
  justify-content: center;
  flex-direction: column;
`;
const RoomCapacity = styled.p`
  display: flex;
`;
const RoomTime = styled.p`
  font-size: 10pt;
`;

const USContainer = styled.div`
  margin-left: 7px;
  margin-top: 1px;

  display: flex;
  align-items: center;
  justify-content: center;
`;

interface IRoom {
  id: string;
  title: string;
  max: number;
  hostNickname: string;
  hostId: string;
  gameState: "waiting" | "playing";
  locked: boolean;
  players: Record<string, IPlayer>;
  time: string;
}

export default function Lobby() {
  const router = useRouter();

  const [rooms, setRooms] = useState<IRoom[]>([]);

  const [userId, setUserId] = useState<string>("");

  const [nickname, setNickname] = useAtom(nicknameAtom);

  const [, setIsCreateOpen] = useAtom(isCreateOpenAtom);
  const [, setIsNicknameOpen] = useAtom(isNicknameOpenAtom);

  const handleCreateRoom = () => {
    setIsCreateOpen(true);
  };

  const handleChangeNickname = () => {
    setIsNicknameOpen(true);
  };

  const initGuestUser = () => {
    // 게스트 생성 / 불러오기
    let savedId = localStorage.getItem("userId");
    let savedNickname = localStorage.getItem("userNickname");

    if (!savedId) {
      savedId = push(ref(rtdb, "users")).key || "user_" + Date.now();
      localStorage.setItem("userId", savedId);
    }

    if (!savedNickname) {
      savedNickname = `회원${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")}`;
      localStorage.setItem("userNickname", savedNickname);
    }

    setUserId(savedId);
    setNickname(savedNickname);

    set(ref(rtdb, `users/${savedId}`), {
      uid: savedId,
      nickname: savedNickname,
      lastActive: serverTimestamp(),
    });
  };

  const subscribeRooms = () => {
    // 방 불러오기
    const roomsRef = ref(rtdb, "rooms");

    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRooms(
          Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          })) as IRoom[]
        );
      } else {
        setRooms([]);
      }
    });
    return unsubscribe;
  };

  useEffect(() => {
    initGuestUser();
    const unsubscribeRooms = subscribeRooms();

    return () => {
      unsubscribeRooms();
    };
  }, []);

  // 방 입장
  const handleEnterRoom = async (roomId: string) => {
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const userRef = ref(rtdb, `rooms/${roomId}/players/${userId}`);

    const result = await runTransaction(roomRef, (currentData) => {
      if (!currentData) {
        alert("해당 방이 존재하지 않거나 이미 게임을 시작하였습니다.");
        return;
      }

      if (currentData.banned?.[userId]) {
        alert("퇴장당한 방에는 입장하실 수 없습니다.");
        return;
      }

      // 이미 입장한 상태
      if (currentData.players?.[userId]) {
        return currentData;
      }

      // 플레이어 입장
      const playerCount = Object.keys(currentData.players ?? {}).length;

      if (playerCount < currentData.max) {
        if (!currentData.players) currentData.players = {};

        currentData.players[userId] = {
          uid: userId,
          nickname,
          joinedAt: Date.now(),
        };

        return currentData;
      }

      if (currentData.locked) {
        alert("관전이 불가능한 방입니다.");
        return;
      }

      // 관전 입장
      if (!currentData.spectators) currentData.spectators = {};

      currentData.spectators[userId] = {
        uid: userId,
        nickname,
        joinedAt: Date.now(),
      };

      return currentData;
    });

    if (result.committed) {
      onDisconnect(userRef).remove();
      router.replace(`/room/${roomId}`);
    }
  };

  const timeName = (time: string) => {
    return time === "default"
      ? "모데라토"
      : time === "speedy"
      ? "안단티노"
      : time === "hyperspeed"
      ? "프레스토"
      : "무제한";
  };

  return (
    <LobbyContainer>
      <RoomCreateModal userId={userId} nickname={nickname} />
      <ChangeNicknameModal userId={userId} />
      <Header>
        <Title>Kotcher</Title>
        <UserNickname>
          닉네임: <strong onClick={handleChangeNickname}>{nickname}</strong>
        </UserNickname>
      </Header>
      <Section>
        <RoomContainer>
          {rooms
            .filter((room) => room.gameState === "waiting")
            .map((room, index) => (
              <Room key={room.id} onClick={() => handleEnterRoom(room.id)}>
                <RoomNumber>{index + 1}</RoomNumber>
                <RoomInfoWrapper>
                  <RoomTitle>{room.title}</RoomTitle>
                  <HostInfo>호스트: {room.hostNickname}</HostInfo>
                </RoomInfoWrapper>
                <RoomConfig>
                  <RoomTime>{timeName(room.time)}</RoomTime>
                  <RoomCapacity>
                    {Object.keys(room.players ?? {}).length}/{room.max}
                    {room.locked && (
                      <USContainer>
                        <UnavailableSpectator />
                      </USContainer>
                    )}
                  </RoomCapacity>
                </RoomConfig>
              </Room>
            ))}
          <MakeRoom onClick={handleCreateRoom}>
            <RoomTitle>+ 방 만들기</RoomTitle>
          </MakeRoom>
        </RoomContainer>
      </Section>
    </LobbyContainer>
  );
}
