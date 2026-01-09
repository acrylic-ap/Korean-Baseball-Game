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
import { isCreateOpenAtom } from "../atom/roomCreateModalAtom";
import { RoomCreateModal } from "./components/RoomCreateModal";

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
const RoomCapacity = styled.p`
  position: absolute;
  right: 15px;
  bottom: 10px;
  font-size: 12pt;

  display: flex;
  align-items: center;
  justify-content: center;
`;

const UnavailableSpectator = styled.svg`
  margin-left: 7px;
`;

interface IRoom {
  id: string;
  title: string;
  current: number;
  max: number;
  hostNickname: string;
  hostId: string;
  gameState: "waiting" | "playing";
  locked: boolean;
}

export default function Lobby() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [rooms, setRooms] = useState<IRoom[]>([]);

  useEffect(() => {
    // 사용자 ID와 닉네임 초기화
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

    // 서버에 접속 기록
    set(ref(rtdb, `users/${savedId}`), {
      uid: savedId,
      nickname: savedNickname,
      lastActive: serverTimestamp(),
    });

    // 실시간 방 데이터 수신
    const roomsRef = ref(rtdb, "rooms");
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRooms(
          Object.keys(data).map((key) => ({ id: key, ...data[key] })) as IRoom[]
        );
      } else {
        setRooms([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const [isCreateOpen, setIsCreateOpen] = useAtom(isCreateOpenAtom);

  const handleCreateRoom = async () => {
    setIsCreateOpen(true);
  };

  const handleEnterRoom = async (roomId: string) => {
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const userRef = ref(rtdb, `rooms/${roomId}/players/${userId}`);

    const result = await runTransaction(roomRef, (currentData) => {
      if (!currentData) return currentData;

      // 이미 플레이어로 들어와 있으면 아무 것도 안 함
      if (currentData.players?.[userId]) {
        return currentData;
      }

      // 플레이어 자리가 남아 있으면 → 플레이어 입장
      if (currentData.current < currentData.max) {
        currentData.current = (currentData.current || 0) + 1;

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

      // 관전자 입장
      if (!currentData.spectators) currentData.spectators = {};

      currentData.spectators[userId] = {
        uid: userId,
        nickname,
        joinedAt: Date.now(),
      };

      return currentData;
    });

    if (result.committed) {
      // Disconnect 처리
      onDisconnect(userRef).remove();
      router.replace(`/room/${roomId}`);
    }
  };

  return (
    <LobbyContainer>
      <RoomCreateModal userId={userId} nickname={nickname} />
      <Header>
        <Title>한국어 야구 게임</Title>
        <UserNickname>
          내 정보: <strong>{nickname}</strong>
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
                <RoomCapacity>
                  {room.current}/{room.max}
                  {room.locked && (
                    <UnavailableSpectator
                      width="15"
                      height="13"
                      viewBox="0 0 20 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M0 8C0 9.64 0.425 10.191 1.275 11.296C2.972 13.5 5.818 16 10 16C14.182 16 17.028 13.5 18.725 11.296C19.575 10.192 20 9.639 20 8C20 6.36 19.575 5.809 18.725 4.704C17.028 2.5 14.182 0 10 0C5.818 0 2.972 2.5 1.275 4.704C0.425 5.81 0 6.361 0 8ZM10 4.25C9.00544 4.25 8.05161 4.64509 7.34835 5.34835C6.64509 6.05161 6.25 7.00544 6.25 8C6.25 8.99456 6.64509 9.94839 7.34835 10.6517C8.05161 11.3549 9.00544 11.75 10 11.75C10.9946 11.75 11.9484 11.3549 12.6517 10.6517C13.3549 9.94839 13.75 8.99456 13.75 8C13.75 7.00544 13.3549 6.05161 12.6517 5.34835C11.9484 4.64509 10.9946 4.25 10 4.25Z"
                        fill="white"
                      />
                      <line
                        x1="2"
                        y1="2"
                        x2="18"
                        y2="14"
                        stroke="red"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </UnavailableSpectator>
                  )}
                </RoomCapacity>
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
