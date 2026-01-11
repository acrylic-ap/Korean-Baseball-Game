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
  get,
} from "firebase/database";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styled from "styled-components";
import {
  isCreateOpenAtom,
  isLoginOpenAtom,
  isNicknameOpenAtom,
} from "../atom/modalAtom";
import { RoomCreateModal } from "./components/RoomCreateModal";
import { UnavailableSpectator } from "@/public/svg/LobbySVG";
import { ChangeNicknameModal } from "./components/ChangeNicknameModal";
import { nicknameAtom } from "../atom/lobbyAtom";
import { IPlayer } from "../atom/gameAtom";
import { LoginModal } from "./components/LoginModal";
import { getAuth, signOut } from "firebase/auth";

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

const UserContainer = styled.div`
  margin-right: 30px;

  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
`;

const UserNickname = styled.div`
  margin-right: 10px;

  color: #ccc;
  font-size: 14pt;

  strong {
    color: #fff;
    margin-left: 5px;
  }
`;

const LoginButton = styled.button`
  background-color: transparent;

  width: 70px;
  height: 30px;

  border: 1px solid gray;

  color: white;
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
  const [userId, setUserId] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nicknameLoaded, setNicknameLoaded] = useState(false);

  const [nickname, setNickname] = useAtom(nicknameAtom);

  const [, setIsCreateOpen] = useAtom(isCreateOpenAtom);
  const [isNicknameOpen, setIsNicknameOpen] = useAtom(isNicknameOpenAtom);
  const [, setIsLoginOpen] = useAtom(isLoginOpenAtom);

  const handleCreateRoom = () => {
    setIsCreateOpen(true);
  };

  const handleChangeNickname = () => {
    setIsNicknameOpen(true);
  };

  const handleLogin = () => {
    setIsLoginOpen(true);
  };

  const initAuthUser = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    // 게스트 정보 정리
    const prevGuestId = localStorage.getItem("guestId");
    if (prevGuestId) {
      await set(ref(rtdb, `guests/${prevGuestId}`), null);
      localStorage.removeItem("guestId");
      localStorage.removeItem("guestNickname");
    }

    setUserId(user.uid);
    setIsLoggedIn(true);

    // 🔥 DB에서 유저 정보 로딩
    const userRef = ref(rtdb, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      setNickname(data.nickname);
    } else {
      // fallback (이론상 거의 안 탐)
      setNickname(user.displayName || "익명");
    }

    setNicknameLoaded(true);
  };

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        initAuthUser();
      } else {
        initGuestUser();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    const auth = getAuth();

    try {
      await signOut(auth);
      setIsLoggedIn(false);
    } catch (e) {
      console.warn("로그아웃에 실패했습니다.", e);
    }
  };

  const initGuestUser = () => {
    // 게스트 생성 / 불러오기
    let guestId = localStorage.getItem("guestId");
    let guestNickname = localStorage.getItem("guestNickname");

    localStorage.removeItem("userId");
    localStorage.removeItem("userNickname");

    if (!guestId) {
      guestId = push(ref(rtdb, "guests")).key || "guest_" + Date.now();
      localStorage.setItem("guestId", guestId);
    }

    if (!guestNickname) {
      guestNickname = `회원${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")}`;
      localStorage.setItem("guestNickname", guestNickname);
    }

    setUserId(null);
    setGuestId(guestId);
    setNickname(guestNickname);

    set(ref(rtdb, `guests/${guestId}`), {
      uid: guestId,
      nickname: guestNickname,
      lastActive: serverTimestamp(),
    });

    setNicknameLoaded(true);
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
    const unsubscribeRooms = subscribeRooms();

    return () => {
      unsubscribeRooms();
    };
  }, []);

  // 방 입장
  const handleEnterRoom = async (roomId: string) => {
    const roomRef = ref(rtdb, `rooms/${roomId}`);

    let role: "players" | "spectators" = "players";

    const participateId = userId ? userId : guestId;

    const result = await runTransaction(roomRef, (currentData) => {
      if (!currentData) {
        alert("해당 방이 존재하지 않거나 이미 게임을 시작하였습니다.");
        return;
      }

      if (currentData.banned?.[participateId]) {
        alert("퇴장당한 방에는 입장하실 수 없습니다.");
        return;
      }

      // 이미 입장한 상태
      if (currentData.players?.[participateId]) {
        return currentData;
      }

      // 플레이어 입장
      const playerCount = Object.keys(currentData.players ?? {}).length;

      if (playerCount < currentData.max) {
        role = "players";

        if (!currentData.players) currentData.players = {};

        currentData.players[participateId] = {
          uid: participateId,
          nickname,
          joinedAt: Date.now(),
        };

        return currentData;
      }

      if (currentData.locked) {
        alert("관전이 불가능한 방입니다.");
        return;
      }

      role = "spectators";

      // 관전 입장
      if (!currentData.spectators) currentData.spectators = {};

      currentData.spectators[participateId] = {
        uid: participateId,
        nickname,
        joinedAt: Date.now(),
      };

      return currentData;
    });

    const participateRef = ref(
      rtdb,
      `rooms/${roomId}/${role}/${participateId}`
    );

    if (result.committed) {
      onDisconnect(participateRef).remove();
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

  useEffect(() => {
    if (nicknameLoaded && nickname === "닉네임 없음") {
      setIsNicknameOpen(true);
    }
  }, [nickname, isNicknameOpen, nicknameLoaded]);

  if (!nicknameLoaded) return null;

  return (
    <LobbyContainer>
      <RoomCreateModal userId={userId ?? guestId} nickname={nickname} />
      {userId && <ChangeNicknameModal userId={userId} />}
      <LoginModal />
      <Header>
        <Title>Kotcher</Title>
        <UserContainer>
          <UserNickname>
            닉네임:{" "}
            <strong
              onClick={() => {
                userId
                  ? handleChangeNickname
                  : alert("로그인을 통해 닉네임을 변경해 주세요!");
              }}
            >
              {nickname}
            </strong>
          </UserNickname>
          {isLoggedIn ? (
            <LoginButton onClick={handleLogout}>로그아웃</LoginButton>
          ) : (
            <LoginButton onClick={handleLogin}>로그인</LoginButton>
          )}
        </UserContainer>
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
