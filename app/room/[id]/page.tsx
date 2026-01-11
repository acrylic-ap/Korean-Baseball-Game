"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import styled from "styled-components";
import { rtdb } from "@/lib/client";
import {
  ref,
  onValue,
  runTransaction,
  onDisconnect,
  set,
  serverTimestamp,
  remove,
  update,
} from "firebase/database";
import { BanIcon, SpectatorEye } from "@/public/svg/RoomSVG";

/* --- Styles --- */
const RoomContainer = styled.div`
  width: 100vw;
  height: 100vh;
  background-color: #1a1a1a;
  color: white;
  display: flex;
  flex-direction: column;
`;
const Header = styled.header`
  display: flex;
  align-items: center;
  padding: 20px;
  background-color: #252525;
`;
const BackButton = styled.button`
  background: none;
  border: 1px solid #555;
  color: white;
  padding: 8px 15px;
  border-radius: 5px;
  cursor: pointer;
  &:hover {
    background: #333;
  }
`;
const RoomInfo = styled.div`
  width: 70%;

  margin-left: 20px;
`;
const RoomTitle = styled.h1`
  font-size: 1.5rem;
  margin: 0;
`;
const Capacity = styled.span`
  color: #aaa;
  font-size: 0.9rem;
`;

const Spectator = styled.div`
  width: 10%;

  display: flex;
  align-items: center;
  justify-content: center;
`;

const SpectatorCount = styled.p`
  margin-left: 6px;

  color: #8b5cf6;
  font-size: 14pt;
`;

const GameSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
`;
const StatusBoard = styled.div`
  text-align: center;
  padding: 40px;
  background: #2c2c2c;
  border-radius: 20px;
  min-width: 350px;
`;
const PlayerList = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 20px;
  justify-content: center;
`;
const PlayerCard = styled.div<{ $isHost?: boolean; $ready?: boolean }>`
  background: ${(props) =>
    props.$isHost || props.$ready ? "#4a3b1d" : "#333"};

  padding: 15px 25px;

  border: 1px solid
    ${(props) => (props.$isHost || props.$ready ? "#ffd700" : "#555")};
  border-radius: 10px;

  text-align: center;
  position: relative;
  min-width: 100px;

  display: flex;
  align-items: center;
  justify-content: center;

  &::before {
    content: "${(props) => (props.$isHost ? "호스트" : "참가자")}";
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: ${(props) =>
      props.$isHost || props.$ready ? "#ffd700" : "#555"};
    color: ${(props) => (props.$isHost || props.$ready ? "#000" : "#fff")};
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 5px;
  }
`;
const BanIconContainer = styled.div`
  margin-left: 5px;
  cursor: pointer;

  display: flex;
`;

const PlayerButtonContainer = styled.div`
  flex-direction: row;
`;

const StartButton = styled.button`
  background-color: #ffd700;
  color: black;
  border: none;
  padding: 12px 30px;
  font-size: 1.2rem;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    background-color: #ffc400;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SpectateButton = styled(StartButton)`
  margin-left: 8px;
`;

const Loading = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #1a1a1a;
  color: white;
`;

interface IPlayerData {
  uid: string;
  nickname: string;
  joinedAt: number;
  ready?: boolean;
}

interface IRoomData {
  title: string;
  max: number;
  hostId: string;
  hostNickname: string;
  gameState: "waiting" | "playing";
  players?: Record<string, IPlayerData>;
  spectators?: Record<string, IPlayerData>;
  locked: boolean;
  time: string;
}

export default function WaitingRoom() {
  const { id } = useParams();
  const router = useRouter();
  const [roomData, setRoomData] = useState<IRoomData | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [myUid, setMyUid] = useState("");
  const isLeaving = useRef(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const roomRef = ref(rtdb, `rooms/${id}`);

    const uid =
      localStorage.getItem("userId") || localStorage.getItem("guestId") || "";
    setMyUid(uid);

    return onValue(roomRef, (snapshot) => {
      const data = snapshot.val();

      setRoomData(data);
      setIsDataLoaded(true);

      if (uid && !data.players?.[uid] && !data.spectators?.[uid]) {
        isLeaving.current = true;
        router.replace("/lobby");
        return;
      }
    });
  }, [id]);

  const toggleReady = () => {
    if (!roomData) return;

    if (!roomData.players) return;
    const playerData = roomData.players[myUid];
    if (!playerData) return;

    const playerRef = ref(rtdb, `rooms/${id}/players/${myUid}`);
    set(playerRef, { ...playerData, ready: !playerData.ready });

    setRoomData((prev) => {
      if (!prev || !prev.players) return prev;
      return {
        ...prev,
        players: {
          ...prev.players,
          [myUid]: { ...prev.players[myUid], ready: !playerData.ready },
        },
      };
    });
  };

  useEffect(() => {
    if (!id || !roomData) return;

    const uid = localStorage.getItem("userId") || "";
    const nickname = localStorage.getItem("userNickname") || "익명";

    const myPlayerRef = ref(rtdb, `rooms/${id}/players/${uid}`);

    const playerCount = Object.keys(roomData.players ?? {}).length;

    if (playerCount < 2) {
      set(myPlayerRef, {
        uid,
        nickname,
        joinedAt: serverTimestamp(),
        ready: false,
      }).then(() => {
        onDisconnect(myPlayerRef).remove();
      });
    }

    return () => {
      if (!isLeaving.current) {
        remove(myPlayerRef).catch(() => {});
      }
    };
  }, [id, router]);

  useEffect(() => {
    if (!roomData) return;

    if (roomData.gameState === "playing") {
      const gameRef = ref(rtdb, `games/${id}`);
      const roomRef = ref(rtdb, `rooms/${id}`);

      const time =
        roomData.time === "default"
          ? 30
          : roomData.time === "speedy"
          ? 10
          : roomData.time === "hyperspeed"
          ? 5
          : undefined;

      set(gameRef, roomData)
        .then(() => {
          remove(roomRef).catch(() => {});
        })
        .finally(() => {
          update(gameRef, {
            gameState: "deciding",
            ...(time !== undefined ? { remainingTime: time } : {}),
          });

          router.replace(`/game/${id}`);
        });
    }
  }, [roomData?.gameState, id, router]);

  if (!isDataLoaded) return <Loading>방 데이터를 동기화 중...</Loading>;
  if (!roomData) return null;

  const players = roomData.players
    ? Object.values(roomData.players).sort(
        (a, b) => (a.joinedAt || 0) - (b.joinedAt || 0)
      )
    : [];
  const isHost = myUid === roomData.hostId;

  const readyPlayers = players.filter((p) => p.uid !== roomData.hostId);
  const allReady =
    readyPlayers.length > 0 && readyPlayers.every((p) => p.ready);

  const leaveRoom = async () => {
    if (!roomData || !myUid) return;

    isLeaving.current = true;

    const roomRef = ref(rtdb, `rooms/${id}`);

    await runTransaction(roomRef, (prev) => {
      if (!prev) return prev;

      const isPlayer = prev.players && prev.players[myUid];
      const isSpectator = prev.spectators && prev.spectators[myUid];

      if (isPlayer) {
        delete prev.players![myUid];
      }

      if (isSpectator) {
        delete prev.spectators![myUid];
      }

      if (isPlayer && prev.hostId === myUid) {
        const playersArray = Object.values(prev.players || []) as IPlayerData[];
        if (playersArray.length > 0) {
          const newHost = playersArray.sort(
            (a, b) => (a.joinedAt || 0) - (b.joinedAt || 0)
          )[0];
          prev.hostId = newHost.uid;
          prev.hostNickname = newHost.nickname;
          if (prev.players![newHost.uid])
            prev.players![newHost.uid].ready = false;
        }
      }

      if (
        (!prev.players || Object.keys(prev.players).length === 0) &&
        (!prev.spectators || Object.keys(prev.spectators).length === 0)
      ) {
        return null;
      }

      return prev;
    });

    router.replace("/lobby");
  };

  const banPlayer = async (targetUid: string) => {
    if (!roomData || !myUid) return;
    if (myUid !== roomData.hostId) return;

    const roomRef = ref(rtdb, `rooms/${id}`);

    await runTransaction(roomRef, (prev) => {
      if (!prev || !prev.players || !prev.players[targetUid]) return prev;

      delete prev.players[targetUid];

      prev.banned = prev.banned || {};
      prev.banned[targetUid] = true;

      if (
        (!prev.players || Object.keys(prev.players).length === 0) &&
        (!prev.spectators || Object.keys(prev.spectators).length === 0)
      ) {
        return null;
      }

      return prev;
    });
  };

  const participateAsPlayer = () => {
    const roomRef = ref(rtdb, `rooms/${id}`);

    runTransaction(roomRef, (prev) => {
      if (!prev) return prev;

      delete prev.spectators?.[myUid];
      prev.players = prev.players || {};
      prev.players[myUid] = {
        uid: myUid,
        nickname: localStorage.getItem("userNickname") || "익명",
        joinedAt: serverTimestamp(),
        ready: false,
      };

      return prev;
    });
  };

  const switchToSpectator = () => {
    const roomRef = ref(rtdb, `rooms/${id}`);

    runTransaction(roomRef, (prev) => {
      if (!prev) return prev;

      delete prev.players?.[myUid];
      prev.spectators = prev.spectators || {};
      prev.spectators[myUid] = {
        uid: myUid,
        nickname: localStorage.getItem("userNickname") || "익명",
        joinedAt: serverTimestamp(),
      };

      return prev;
    });
  };

  return (
    <RoomContainer>
      <Header>
        <BackButton onClick={leaveRoom}>← 나가기</BackButton>
        <RoomInfo>
          <RoomTitle>{roomData.title}</RoomTitle>
          <Capacity>
            {Object.keys(roomData.players ?? {}).length} / {roomData.max}
          </Capacity>
        </RoomInfo>
        {!roomData.locked && (
          <Spectator>
            <SpectatorEye />

            <SpectatorCount>
              {roomData.spectators
                ? Object.keys(roomData.spectators).length
                : 0}
            </SpectatorCount>
          </Spectator>
        )}
      </Header>
      <GameSection>
        <StatusBoard>
          <h2>대기실</h2>
          <PlayerList>
            {players.map((p) => (
              <PlayerCard
                key={p.uid}
                $isHost={p.uid === roomData.hostId}
                $ready={p.ready}
              >
                {p.nickname} {p.uid === myUid && "(나)"}
                {isHost && p.uid !== myUid && (
                  <BanIconContainer onClick={() => banPlayer(p.uid)}>
                    <BanIcon />
                  </BanIconContainer>
                )}
              </PlayerCard>
            ))}
            {players.length < 2 && (
              <PlayerCard style={{ opacity: 0.5, borderStyle: "dashed" }}>
                대기 중...
              </PlayerCard>
            )}
          </PlayerList>
        </StatusBoard>

        {roomData.gameState === "waiting" && (
          <>
            {isHost ? (
              <StartButton
                disabled={!allReady}
                onClick={() =>
                  set(ref(rtdb, `rooms/${id}/gameState`), "playing")
                }
              >
                게임 시작
              </StartButton>
            ) : roomData.players && roomData.players[myUid] ? (
              <PlayerButtonContainer>
                <StartButton onClick={toggleReady}>
                  {roomData.players?.[myUid]?.ready ? "준비 취소" : "준비"}
                </StartButton>
                <SpectateButton onClick={switchToSpectator}>
                  관전
                </SpectateButton>
              </PlayerButtonContainer>
            ) : (
              <StartButton
                onClick={participateAsPlayer}
                disabled={Object.keys(roomData?.players ?? {}).length === 2}
              >
                {Object.keys(roomData?.players ?? {}).length === 1
                  ? "참여하기"
                  : "참여 불가"}
              </StartButton>
            )}
          </>
        )}
      </GameSection>
    </RoomContainer>
  );
}
