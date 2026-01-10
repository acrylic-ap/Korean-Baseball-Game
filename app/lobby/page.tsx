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
import { levenshtein } from "./tools/Levenshtein";
import { UnavailableSpectator } from "@/public/svg/LobbySVG";

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
  bottom: 7px;
  font-size: 12pt;

  display: flex;
  align-items: center;
  justify-content: center;
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

      if (currentData.banned?.[userId]) {
        alert("퇴장당한 방에는 입장하실 수 없습니다.");
        return;
      }

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

  const changeNickname = async () => {
    const nicknameRef = ref(rtdb, `users/${userId}/nickname`);

    const input = prompt(
      `닉네임을 변경해 보세요.\n공백으로 제출 시 취소됩니다.`
    );
    if (!input) return;

    const nickname = input.trim();
    if (!nickname) return; // 공백만 입력 시 취소

    if (!/^[가-힣a-zA-Z0-9]+$/.test(nickname)) {
      alert("닉네임에는 영어, 한글, 숫자만 사용할 수 있습니다.");
      return;
    }

    // 금지 단어 비교: 소문자 + 공백 제거
    const forbidden = ["acrylic", "아크릴릭"];
    const normalized = nickname.toLowerCase();
    const isForbidden = forbidden.some(
      (word) => levenshtein(word, normalized) <= 2
    );

    if (isForbidden) {
      alert("운영자를 굉장히 존경하시나 보네요?");
      return;
    }

    localStorage.setItem("userNickname", nickname);
    await set(nicknameRef, nickname);
    setNickname(nickname);
  };

  return (
    <LobbyContainer>
      <RoomCreateModal userId={userId} nickname={nickname} />
      <Header>
        <Title>한국어 야구 게임</Title>
        <UserNickname>
          닉네임: <strong onClick={changeNickname}>{nickname}</strong>
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
                    <USContainer>
                      <UnavailableSpectator />
                    </USContainer>
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
