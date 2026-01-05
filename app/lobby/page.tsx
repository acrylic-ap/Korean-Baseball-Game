"use client";
import { rtdb } from "@/lib/firebase";
import {
  onValue,
  push,
  ref,
  runTransaction,
  set,
  serverTimestamp,
  onDisconnect,
} from "firebase/database";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styled from "styled-components";

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
  border: 1px dashed #555;
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
`;

interface IRoom {
  id: string;
  title: string;
  current: number;
  max: number;
  hostNickname: string;
  hostId: string;
  gameState: "waiting" | "playing";
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

  const handleCreateRoom = async () => {
    if (!userId) return;
    const title = prompt("방 제목:");
    if (!title) return;

    const newRoomRef = push(ref(rtdb, "rooms"));
    await set(newRoomRef, {
      title,
      current: 1,
      max: 2,
      hostId: userId,
      hostNickname: nickname,
      gameState: "waiting",
      createdAt: serverTimestamp(),
      players: {
        [userId]: { uid: userId, nickname, joinedAt: serverTimestamp() },
      },
    });
    router.push(`/room/${newRoomRef.key}`);
  };

  const handleEnterRoom = async (roomId: string) => {
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const userRef = ref(rtdb, `rooms/${roomId}/players/${userId}`);

    const result = await runTransaction(roomRef, (currentData) => {
      if (currentData) {
        if (currentData.current >= currentData.max) return; // 방 꽉 참
        currentData.current = (currentData.current || 0) + 1;
        if (!currentData.players) currentData.players = {};
        currentData.players[userId] = {
          uid: userId,
          nickname,
          joinedAt: Date.now(),
        };
      }
      return currentData;
    });

    if (result.committed) {
      // Disconnect 처리
      onDisconnect(userRef).remove();
      router.push(`/room/${roomId}`);
    } else {
      alert("방이 가득 찼습니다!");
    }
  };

  return (
    <LobbyContainer>
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
              <Room
                key={room.id}
                onClick={() => {
                  if (room.current >= room.max) {
                    alert("방이 가득 찼습니다!");
                    return;
                  }
                  handleEnterRoom(room.id);
                }}
              >
                <RoomNumber>{index + 1}</RoomNumber>
                <RoomInfoWrapper>
                  <RoomTitle>{room.title}</RoomTitle>
                  <HostInfo>호스트: {room.hostNickname}</HostInfo>
                </RoomInfoWrapper>
                <RoomCapacity>
                  {room.current}/{room.max}
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
