"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import styled from "styled-components";
import { rtdb } from "@/lib/firebase";
import {
  ref,
  onValue,
  runTransaction,
  onDisconnect,
  set,
  serverTimestamp,
  remove,
  off,
  update,
} from "firebase/database";

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
const PlayerCard = styled.div<{ $isHost?: boolean }>`
  padding: 15px 25px;
  background: ${(props) => (props.$isHost ? "#4a3b1d" : "#333")};
  border: 1px solid ${(props) => (props.$isHost ? "#ffd700" : "#555")};
  border-radius: 10px;
  text-align: center;
  position: relative;
  min-width: 100px;
  &::before {
    content: "${(props) => (props.$isHost ? "호스트" : "참가자")}";
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: ${(props) => (props.$isHost ? "#ffd700" : "#555")};
    color: ${(props) => (props.$isHost ? "#000" : "#fff")};
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 5px;
  }
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
  current: number;
  max: number;
  hostId: string;
  hostNickname: string;
  gameState: "waiting" | "playing";
  players?: Record<string, IPlayerData>;
}

export default function WaitingRoom() {
  const { id } = useParams();
  const router = useRouter();
  const [roomData, setRoomData] = useState<IRoomData | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [myUid, setMyUid] = useState("");
  const isLeaving = useRef(false);

  // --- 플레이어 준비 토글 ---
  const toggleReady = () => {
    if (!roomData?.players) return;
    const playerData = roomData.players[myUid];
    if (!playerData) return;

    const playerRef = ref(rtdb, `rooms/${id}/players/${myUid}`);
    set(playerRef, { ...playerData, ready: !playerData.ready });

    // 화면 즉시 반영
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
    if (!id) return;

    const uid = localStorage.getItem("userId") || "";
    const nickname = localStorage.getItem("userNickname") || "익명";
    setMyUid(uid);

    const roomRef = ref(rtdb, `rooms/${id}`);
    const myPlayerRef = ref(rtdb, `rooms/${id}/players/${uid}`);

    // --- 1. 플레이어 정보 등록 + onDisconnect ---
    set(myPlayerRef, {
      uid,
      nickname,
      joinedAt: serverTimestamp(),
      ready: false,
    }).then(() => {
      onDisconnect(myPlayerRef).remove(); // 강제 종료 시 플레이어 제거
      onDisconnect(roomRef).update({ current: 1 });
    });

    // --- 2. 리스너 연결 ---
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val() as IRoomData;

      if (!data) {
        if (!isLeaving.current) router.replace("/lobby");
        return;
      }

      // --- 호스트 자동 승계 ---
      if (data.players && data.hostId && !data.players[data.hostId]) {
        const sorted = Object.values(data.players).sort(
          (a, b) => (a.joinedAt || 0) - (b.joinedAt || 0)
        );
        if (sorted.length > 0) {
          runTransaction(roomRef, (prev) => {
            if (!prev) return prev;
            const newHost = sorted[0].uid;
            prev.hostId = newHost;
            prev.hostNickname = sorted[0].nickname;

            // 새 호스트 ready 초기화
            prev.players = prev.players || {};
            if (prev.players[newHost]) prev.players[newHost].ready = false;
            return prev;
          });
        }
      }

      setRoomData(data);
      setIsDataLoaded(true);
    });

    // --- 4. cleanup / 나가기 ---
    return () => {
      isLeaving.current = true;

      // 내 플레이어 정보 삭제
      remove(myPlayerRef).catch(() => {});

      // 방 정보 트랜잭션
      runTransaction(roomRef, (prev) => {
        if (!prev) return prev;

        // --- 게임 중이면 방 삭제 로직 스킵 ---
        if (prev.gameState === "playing") {
          // 플레이어 정보만 삭제, 방 자체는 삭제하지 않음
          if (prev.players && prev.players[uid]) delete prev.players[uid];
          prev.current = Math.max(0, (prev.current || 1) - 1);
          return prev;
        }

        // --- 게임 전(대기 중) --- 기존 로직 그대로
        if (prev.players && prev.players[uid]) delete prev.players[uid];
        prev.current = Math.max(0, (prev.current || 1) - 1);

        // 모든 플레이어가 나가면 방 삭제
        if (
          (!prev.players || Object.keys(prev.players).length === 0) &&
          prev.current === 0
        ) {
          return null;
        }

        return prev;
      }).catch(() => {});

      // 리스너 정리
      off(roomRef);
    };
  }, [id, router]);

  // --- 3. gameState 자동 이동 ---
  useEffect(() => {
    if (roomData?.gameState === "playing") {
      const gameRef = ref(rtdb, `games/${id}`);
      const roomRef = ref(rtdb, `rooms/${id}`);

      // 1. rooms/${id} 데이터를 games/${id}로 이동
      set(gameRef, roomData)
        .then(() => {
          // 2. room은 삭제
          remove(roomRef).catch(() => {});
        })
        .finally(() => {
          // 3. 게임 페이지로 이동
          update(gameRef, { gameState: "deciding" });
          router.push(`/game/${id}`);
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

  // --- 호스트 버튼 활성화: 최소 1명의 참가자가 준비 ---
  const readyPlayers = players.filter((p) => p.uid !== roomData.hostId);
  const allReady =
    readyPlayers.length > 0 && readyPlayers.every((p) => p.ready);

  return (
    <RoomContainer>
      <Header>
        <BackButton
          onClick={() => {
            isLeaving.current = true;
            router.replace("/lobby");
          }}
        >
          ← 나가기
        </BackButton>
        <RoomInfo>
          <RoomTitle>{roomData.title}</RoomTitle>
          <Capacity>
            {roomData.current} / {roomData.max}
          </Capacity>
        </RoomInfo>
      </Header>
      <GameSection>
        <StatusBoard>
          <h2>
            {roomData.gameState === "playing"
              ? "🎮 게임 중"
              : "야구 게임 대기 중"}
          </h2>
          <PlayerList>
            {players.map((p) => (
              <PlayerCard key={p.uid} $isHost={p.uid === roomData.hostId}>
                {p.nickname} {p.uid === myUid && "(나)"} {p.ready ? "✅" : ""}
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
            ) : (
              <StartButton onClick={toggleReady}>
                {roomData.players?.[myUid]?.ready ? "준비 취소" : "준비"}
              </StartButton>
            )}
          </>
        )}
      </GameSection>
    </RoomContainer>
  );
}
