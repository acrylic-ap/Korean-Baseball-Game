"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { rtdb } from "@/lib/client";
import {
  ref,
  get,
  onValue,
  update,
  runTransaction,
  push,
  onChildAdded,
} from "firebase/database";
import { styled } from "styled-components";
import React from "react";
import { useAtom } from "jotai";
import {
  gameAtom,
  IGame,
  IPlayer,
  IUser,
  myIdAtom,
  myUserInfoAtom,
} from "@/app/atom/gameAtom";
import { SolvingListComponent } from "./components/SolvingListComponent";
import { userAgent } from "next/server";

const GamePage = styled.div`
  background: linear-gradient(135deg, #242424 0%, #0b0b0b 100%);

  width: 100%;
  height: 100%;
`;

const Header = styled.header`
  width: 100%;
  height: 10%;

  display: flex;
  align-items: center;
  justify-content: center;
`;

const Section = styled.section`
  width: 100%;
  height: 80%;

  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const Title = styled.p`
  font-size: 22pt;
  font-weight: 600;

  margin-bottom: 30px;
`;

const GameContainer = styled.div`
  position: relative;

  background-color: #252525;

  box-shadow: 3px 3px 8px rgba(0, 0, 0, 0.3);

  border-radius: 10px;

  width: 90%;
  height: 50%;

  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const Subtitle = styled.p`
  width: 80%;

  font-size: 13pt;
  font-weight: 500;

  text-align: center;

  margin-bottom: 12px;

  white-space: pre-wrap;

  @media screen and (min-width: 768px) {
    font-size: 18pt;
  }
`;

const DecideWaitTitle = styled(Subtitle)``;

const InputContainer = styled.div`
  width: 100%;

  display: flex;
  align-items: center;
  justify-content: center;
`;

const Input = styled.input<{ $enabled?: boolean }>`
  background-color: ${({ $enabled }) =>
    $enabled ? "rgba(70, 70, 70, 0.7)" : "transparent"};
  width: 30%;
  height: 30px;
  box-sizing: border-box;

  border: 1px solid white;
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
  border-right: none;

  font-size: 10pt;
  color: white;
  text-align: center;

  outline: none;
`;

const SubmitButton = styled.button<{ $enabled?: boolean }>`
  background-color: ${({ $enabled }) => ($enabled ? "#EF4444" : "#3b82f6")};

  border: 1px solid white;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;

  height: 30px;
  width: 45px;
  box-sizing: border-box;

  color: white;
  font-size: 10pt;

  /* 부드러운 트랜지션 */
  transition: background-color 0.2s ease, transform 0.1s ease,
    box-shadow 0.2s ease;

  /* 호버 효과 */
  &:hover {
    background-color: ${({ $enabled }) =>
      $enabled ? "#DC2626" : "#2563eb"}; /* 살짝 진한 파랑 */
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }

  &:active {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
`;

// deciding
const PlayerDecidedContainer = styled.div`
  position: absolute;
  right: 10px;
  top: 20px;

  display: flex;
  flex-direction: column;
`;

const DecidedContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;

  margin-bottom: 8px;
`;

const DecidedText = styled.p`
  font-size: 9pt;
  color: white;

  margin-right: 5px;

  @media screen and (min-width: 768px) {
    font-size: 12pt;
  }
`;

const DecidedCircle = styled.div<{ $isDecide: boolean }>`
  width: 12px;
  height: 12px;

  border: 1px solid white;
  border-radius: 50%;

  display: inline-block;
  margin-right: 8px;

  background-color: ${({ $isDecide }) => ($isDecide ? "blue" : "red")};
  transition: background-color 0.3s ease;
`;

// solving
const SolvingContainer = styled(GameContainer)`
  flex-direction: row;
`;

const InputPreview = styled.p`
  margin-top: 10px;
`;

const SolvingTitle = styled(Subtitle)`
  white-space: pre-wrap;
`;

const SolvingFieldContainer = styled.div`
  width: 75%;
  height: 100%;

  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  @media screen and (min-width: 768px) {
    width: 80%;
  }
`;

const TOTAL_TIME = 30;

const TurnTime = styled.div<{ $remainingTime: number }>`
  position: absolute;
  right: 15px;
  top: 15px;

  width: 30px;
  height: 30px;

  border: 1px solid #9c9c9c;
  border-radius: 50%;

  background: ${({ $remainingTime }) => {
    const progress = 1 - $remainingTime / TOTAL_TIME;
    const angle = progress * 360;

    let activeColor = "#696969"; // 기본 (여유)
    if ($remainingTime <= 10) activeColor = "#f59e0b"; // 주황
    if ($remainingTime <= 5) activeColor = "#ef4444"; // 빨강

    return `
      conic-gradient(
        #1E1E1E 0deg ${angle}deg,
        ${activeColor} ${angle}deg 360deg
      )
    `;
  }};
`;

// end

const EndContainer = styled(GameContainer)`
  flex-direction: row;
`;

const EndFieldContainer = styled.div`
  width: 75%;
  height: 100%;

  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  @media screen and (min-width: 768px) {
    width: 80%;
  }
`;

const EndTitle = styled(Subtitle)`
  font-size: 14pt;

  @media screen and (min-width: 768px) {
    font-size: 16pt;
  }
`;

const Answer = styled.p`
  font-size: 12pt;

  margin-bottom: 10px;

  @media screen and (min-width: 768px) {
    font-size: 14pt;
  }
`;

const LobbyButton = styled.button`
  background-color: #3b82f6;

  border: 1px solid white;
  border-radius: 5px;

  height: 30px;
  box-sizing: border-box;

  color: white;
  font-size: 11pt;

  /* 부드러운 트랜지션 */
  transition: background-color 0.2s ease, transform 0.1s ease,
    box-shadow 0.2s ease;

  /* 호버 효과 */
  &:hover {
    background-color: #2563eb; /* 살짝 진한 파랑 */
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }

  &:active {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
`;

// Chat

const ChatContainer = styled.div`
  width: 100%;

  margin-top: 10px;

  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const Chat = styled.div`
  background-color: #252525;
  box-shadow: 3px 3px 8px rgba(0, 0, 0, 0.3);

  width: 90%;
  height: 160px;

  border-radius: 10px;

  display: flex;
  align-items: center;
  flex-direction: column;
`;

const ChatText = styled.div`
  width: 100%;
  height: 75%;

  margin: 10px;

  overflow-y: auto;

  display: flex;
  flex-direction: column;

  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const ChatContent = styled.p`
  font-size: 10pt;

  margin-top: 10px;
  margin-left: 10px;

  display: flex;
  align-items: center;
  flex-direction: row;

  @media screen and (min-width: 768px) {
    font-size: 12pt;
  }
`;

const HostChat = styled.div`
  width: 12px;
  height: 12px;

  margin-right: 3px;
  margin-bottom: 4px;
`;

const Nickname = styled.p``;

const Seperator = styled.p`
  margin: 0 5px;
`;

const Message = styled.p``;

const ChatInputContainer = styled.div`
  width: 100%;
  height: 25%;

  margin-bottom: 10px;

  display: flex;
  align-items: center;
  justify-content: center;
`;

const ChatInput = styled(Input)`
  width: 70%;

  border-right: 1px solid white;
  border-radius: 5px;

  padding-left: 5px;

  font-size: 10pt;
  text-align: left;

  margin-right: 5px;
`;

const ChatButton = styled(SubmitButton)`
  background-color: #3b82f6;

  border: none;
  border-radius: 5px;
`;

const StyledChar = styled.span<{ $status: string }>`
  font-size: 12pt;

  font-weight: ${({ $status }) => ($status === "?" ? "100" : "bold")};

  color: ${({ $status }) => {
    switch ($status) {
      case "O":
        return "white";
      case "X":
        return "gray";
      case "@":
        return "#facc15";
      case "?":
        return "white";
      default:
        return "white";
    }
  }};
`;

export default function GameRoom() {
  const { id } = useParams();
  const router = useRouter();
  const [game, setGame] = useAtom(gameAtom);
  const [myUserInfo, setMyUserInfo] = useAtom(myUserInfoAtom);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  const [myId, setMyId] = useAtom<string | null>(myIdAtom);
  const [isHost, setIsHost] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!id) return;

    const getMyUserData = async () => {
      const myUserId = localStorage.getItem("userId") || "";
      const userRef = ref(rtdb, `users/${myUserId}`);
      const user = await get(userRef).then(
        (snapshot) => snapshot.val() as IUser
      );

      setMyUserInfo(user);
    };

    getMyUserData();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const gameRef = ref(rtdb, `games/${id}`);
    const myUserId = localStorage.getItem("userId") || "";

    return onValue(gameRef, (snapshot) => {
      const snapshotData = snapshot.val();
      const { remainingTime, ...gameData } = snapshotData as IGame;

      setMyId(myUserId);
      if (remainingTime) setRemainingTime(remainingTime);
      setGame(gameData);
      setIsHost(myUserId === gameData.hostId);
    });
  }, [id]);

  useEffect(() => {
    if (!id || !myUserInfo) return;

    const gameRef = ref(rtdb, `games/${id}`);
    const myUserId = localStorage.getItem("userId") || "";

    get(gameRef).then((snapshot) => {
      if (!snapshot.exists()) {
        router.replace("/lobby");
        return;
      }

      runTransaction(gameRef, (game: IGame | null) => {
        if (!game) return game;

        if (!game.players?.[myUserId]) {
          return {
            ...game,
            spectators: {
              ...(game.spectators ?? {}),
              [myUserId]: {
                userId: myUserId,
                username: myUserInfo?.nickname,
              },
            },
          };
        }
        return game;
      });
    });
  }, [id, myUserInfo]);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;

    const gameRef = ref(rtdb, `games/${id}`);
    const playerRef = ref(rtdb, `games/${id}/players`);

    const unsubscribe = onValue(gameRef, (snapshot) => {
      const snapshotData = snapshot.val();

      const { remainingTime, ...data } = snapshotData as IGame;

      if (!data || !game) return;

      setGame((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(data)) {
          return data;
        }
        return prev;
      });

      if (remainingTime) setRemainingTime(remainingTime);

      if (!isHost) return;

      const remainingTimeRef = ref(rtdb, `games/${id}/remainingTime`);

      switch (data.gameState) {
        case "deciding":
          runTransaction(playerRef, (players) => {
            if (!players) return players;

            const updated: Record<string, any> = {};
            let allDecided = true; // 모든 플레이어가 결정했는지 체크

            Object.entries(players).forEach(([uid, player]: [string, any]) => {
              const isDecide = player.isDecide ?? false; // 없으면 false
              updated[uid] = { ...player, isDecide };
              if (!isDecide) allDecided = false; // 하나라도 false면 전체 false
            });

            // 모든 플레이어가 결정했으면 gameState를 ordering으로
            if (allDecided) {
              update(gameRef, { gameState: "ordering" });
            }

            return updated;
          });

          break;
        case "ordering":
          if (!game.players) return;

          const playersArray = Object.values(game.players);
          const selectedPlayer =
            playersArray[Math.floor(Math.random() * playersArray.length)];

          update(gameRef, {
            currentOrder: selectedPlayer.uid,
            gameState: "solving",
          });
          break;
        case "solving":
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }

          timerRef.current = window.setTimeout(() => {
            runTransaction(remainingTimeRef, (data) => {
              if (data === null) return data;

              const remainingTime = data - 1;

              if (remainingTime > 0) {
                return remainingTime;
              }

              const players: IPlayer[] = Object.values(snapshotData.players!);
              const nextPlayer = players.find(
                (p) => p.uid !== snapshotData.currentOrder
              );

              update(gameRef, {
                currentOrder: nextPlayer?.uid,
              });

              return 30;
            });
          }, 1000);

          break;
        case "end":
          break;
        default:
          break;
      }
    });
  }, [id, game, router, isHost]);

  const [decideText, setDecideText] = useState("");

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDecideText(e.target.value);
  };

  const handleSubmitDecideChange = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      submitDecide();
    }
  };

  useEffect(() => {
    setDecideText("");
  }, [game?.gameState]);

  const submitDecide = () => {
    const playerRef = ref(rtdb, `games/${id}/players/${myId}`);

    if (hasDecided) {
      update(playerRef, { isDecide: false });

      return;
    }

    if (!decideText) return;

    // 한글이나 영어인지 판단
    const hasInvalidChar = /[^가-힣a-zA-Z]/.test(decideText);

    if (hasInvalidChar) {
      alert("한글이나 영어만 가능합니다. 띄어쓰기는 불가능합니다.");
      return;
    }

    update(playerRef, { guessWord: decideText, isDecide: true });
  };

  // 한 글자 초성 뽑는 함수
  const getInitial = (ch: string) => {
    const INITIALS = [
      "ㄱ",
      "ㄲ",
      "ㄴ",
      "ㄷ",
      "ㄸ",
      "ㄹ",
      "ㅁ",
      "ㅂ",
      "ㅃ",
      "ㅅ",
      "ㅆ",
      "ㅇ",
      "ㅈ",
      "ㅉ",
      "ㅊ",
      "ㅋ",
      "ㅌ",
      "ㅍ",
      "ㅎ",
    ];

    const code = ch.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) return ch; // 한글 아니면 그대로
    const idx = Math.floor((code - 0xac00) / 588);
    return INITIALS[idx];
  };

  const getMedial = (ch: string): string => {
    const MEDIALS = [
      "ㅏ",
      "ㅐ",
      "ㅑ",
      "ㅒ",
      "ㅓ",
      "ㅔ",
      "ㅕ",
      "ㅖ",
      "ㅗ",
      "ㅘ",
      "ㅙ",
      "ㅚ",
      "ㅛ",
      "ㅜ",
      "ㅝ",
      "ㅞ",
      "ㅟ",
      "ㅠ",
      "ㅡ",
      "ㅢ",
      "ㅣ",
    ];

    const code = ch.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) return "";
    const medialIndex = Math.floor(((code - 0xac00) % 588) / 28);
    return MEDIALS[medialIndex];
  };

  const getFinal = (ch: string): string => {
    const FINAL_CONSONANTS = [
      "",
      "ㄱ",
      "ㄲ",
      "ㄳ",
      "ㄴ",
      "ㄵ",
      "ㄶ",
      "ㄷ",
      "ㄹ",
      "ㄺ",
      "ㄻ",
      "ㄼ",
      "ㄽ",
      "ㄾ",
      "ㄿ",
      "ㅀ",
      "ㅁ",
      "ㅂ",
      "ㅄ",
      "ㅅ",
      "ㅆ",
      "ㅇ",
      "ㅈ",
      "ㅊ",
      "ㅋ",
      "ㅌ",
      "ㅍ",
      "ㅎ",
    ];

    const code = ch.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) return "";
    const finalIndex = (code - 0xac00) % 28;
    return FINAL_CONSONANTS[finalIndex];
  };

  const resultWord = (targetWord: string, compareWord: string) => {
    if (compareWord.length > 9) {
      const tCount: Record<string, number> = {};
      for (const c of targetWord) tCount[c] = (tCount[c] || 0) + 1;

      let includes = 0;
      for (const c of compareWord) {
        if (tCount[c] > 0) {
          includes++;
          tCount[c]--;
        }
      }

      return `포함 개수: ${includes}개`;
    }

    const t = [...targetWord];
    const c = [...compareWord];

    // 🔥 compareWord 길이까지만 판단
    const max = c.length;

    const result = Array(max).fill("?");
    const remain: Record<string, number> = {};

    // targetWord 글자 개수 카운트
    for (const ch of t) {
      remain[ch] = (remain[ch] || 0) + 1;
    }

    // 1️⃣ 정확히 일치 (O)
    for (let i = 0; i < max; i++) {
      if (t[i] === c[i]) {
        result[i] = "O";
        remain[c[i]]--;
      }
    }

    // 2️⃣ 포함 여부 (@ / X)
    for (let i = 0; i < max; i++) {
      if (result[i] !== "?") continue;

      const ch = c[i];
      if (remain[ch] > 0) {
        result[i] = "@";
        remain[ch]--;
      } else {
        result[i] = "X";
      }
    }

    for (let i = 0; i < max; i++) {
      if (result[i] != "X") continue;

      const char = c[i];
      const targetChar = t[i];

      if (!char || !targetChar) continue;

      const charInitial = getInitial(char);
      const targetCharInitial = getInitial(targetChar);
      const charMedial = getMedial(char);
      const targetMedial = getMedial(targetChar);
      const charFinal = getFinal(char);
      const targetFinal = getFinal(targetChar);

      let res = "";

      if (charInitial === targetCharInitial) {
        res += "ㄱ";
      }

      if (charMedial === targetMedial) {
        res += "ㅏ";
      }

      if (charFinal === targetFinal) {
        res += "ㅁ";
      }

      if (res) {
        if (res === "ㄱㅏ") {
          res = "가";
        } else if (res === "ㅏㅁ") {
          res = "암";
        } else if (res === "ㄱㅁ") {
          res = "금";
        }

        result[i] = res;
      }
    }
    return result.join("");
  };

  const handleGuessChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      guess();
    }
  };

  const guess = () => {
    if (!game) return;

    if (!myId || !game.players) return;

    if (!decideText) return;

    // 두 명 플레이어
    const players = Object.values(game.players);
    const nextPlayer = players.find((p) => p.uid !== game.currentOrder);

    if (!nextPlayer) return; // 안전망

    const gameRef = ref(rtdb, `games/${id}`);

    if (nextPlayer.guessWord === decideText) {
      update(gameRef, { gameState: "end", winner: myId });
      setDecideText("");
      return;
    } else {
      const newGuess = {
        word: decideText,
        result: resultWord(nextPlayer.guessWord!, decideText),
        playerId: myId,
      };

      update(gameRef, {
        guessStack: [...(game.guessStack ?? []), newGuess],
        currentOrder: nextPlayer.uid,
        remainingTime: 30,
      });
    }

    update(gameRef, { currentOrder: nextPlayer.uid });

    setDecideText("");
  };

  interface ChatMessage {
    message: string;
    userId: string;
    nickname: string;
  }

  const [chatText, setChatText] = useState("");
  const [chatList, setChatList] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!id) return;

    const chatsRef = ref(rtdb, `chats/${id}`);
    const unsubscribe = onChildAdded(chatsRef, (snapshot) => {
      const data = snapshot.val();
      setChatList((prev) => [...prev, data]);
    });

    return () => unsubscribe();
  }, [id]);

  const handleChatTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatText(e.target.value);
  };

  const handleSubmitChatChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key == "Enter") {
      submitChat();
    }
  };

  const submitChat = async () => {
    if (!id) return;

    if (!chatText) return;

    const chatsRef = ref(rtdb, `chats/${id}`); // RTDB 경로

    push(chatsRef, {
      message: chatText,
      userId: myId,
      nickname: myUserInfo?.nickname,
    });

    setChatText("");
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatList]);

  const back = async () => {
    const chatsRef = ref(rtdb, `chats/${id}`);
    const nicknameRef = ref(rtdb, `games/${id}/players/${myId}/nickname`);

    const nickname = await (await get(nicknameRef)).val();

    push(chatsRef, {
      nickname: "System",
      message: `${nickname} 님이 게임에서 나가셨습니다.`,
    });

    router.replace("/lobby");
  };

  if (!game) return <div>로딩중...</div>;

  const me = myId ? game.players?.[myId] : null;
  const hasDecided = me?.isDecide;
  const correctWord =
    game.players &&
    Object.values(game.players).find((p) => p.uid !== myId)?.guessWord;

  const myGuessStack = game.guessStack?.filter(
    (guess) => guess.playerId === myId
  );

  const syllableMap = new Map<string, string>();

  myGuessStack?.forEach((item) => {
    item.word.split("").forEach((char, idx) => {
      if (!game.players) return;

      const opponentWord = Object.values(game.players).find(
        (p) => p.uid !== myId
      )?.guessWord;
      if (!opponentWord) return;

      const resultChar = item.result[idx];
      const status = resultChar === "O" ? "O" : resultChar === "X" ? "X" : "@";

      const key = `${char}-${idx}`;
      const prev = syllableMap.get(key);

      if (!opponentWord.includes(char)) {
        syllableMap.set(char, "X");
        return;
      } else if (opponentWord[idx] !== char) {
        syllableMap.set(key, "@");
        return;
      } else if (!prev) syllableMap.set(key, status);
    });
  });

  const isPlaying = game.players && myId && game.players[myId] ? true : false;

  return (
    <GamePage>
      <Header></Header>
      <Section>
        <Title>{game.title}</Title>
        {game.gameState === "deciding" ? (
          <GameContainer>
            {isPlaying && !hasDecided ? (
              <Subtitle>상대방이 맞힐 단어를 정해 주세요!</Subtitle>
            ) : isPlaying ? (
              <DecideWaitTitle>상대방을 기다리고 있어요...</DecideWaitTitle>
            ) : (
              <Subtitle>플레이어들이 단어를 정하고 있어요.</Subtitle>
            )}
            {isPlaying && (
              <InputContainer>
                <Input
                  $enabled={hasDecided}
                  type="text"
                  value={decideText}
                  onChange={handleTextChange}
                  onKeyDown={handleSubmitDecideChange}
                  maxLength={9}
                  disabled={hasDecided}
                />
                <SubmitButton $enabled={hasDecided} onClick={submitDecide}>
                  {!hasDecided ? "완료" : "수정"}
                </SubmitButton>
              </InputContainer>
            )}

            <PlayerDecidedContainer>
              {game.players &&
                Object.values(game.players).map((p) => (
                  <DecidedContainer>
                    <DecidedText>
                      {p.nickname}
                      {p.uid === myId && "(나)"}
                    </DecidedText>
                    <DecidedCircle $isDecide={p.isDecide ? true : false} />
                  </DecidedContainer>
                ))}
            </PlayerDecidedContainer>
          </GameContainer>
        ) : game.gameState === "solving" ? (
          <SolvingContainer>
            <SolvingListComponent />

            <SolvingFieldContainer>
              {remainingTime && <TurnTime $remainingTime={remainingTime} />}

              {myId && game.currentOrder === myId ? (
                <>
                  <SolvingTitle>단어를 입력해 주세요!</SolvingTitle>
                  <InputContainer>
                    <Input
                      type="text"
                      value={decideText}
                      onChange={handleTextChange}
                      onKeyDown={handleGuessChange}
                    />
                    <SubmitButton onClick={guess}>확인</SubmitButton>
                  </InputContainer>
                  <InputPreview>
                    {decideText.split("").map((char, idx) => {
                      const key = `${char}-${idx}`;
                      const status =
                        syllableMap.get(char) === "X"
                          ? "X"
                          : syllableMap.get(key) ?? "?";

                      return <StyledChar $status={status}>{char}</StyledChar>;
                    })}
                  </InputPreview>
                </>
              ) : (
                <>
                  <SolvingTitle>
                    {isPlaying
                      ? `잠시만 기다려 주세요, 
상대가 단어를 고르고 있어요.`
                      : "관전 중입니다."}
                  </SolvingTitle>
                </>
              )}
            </SolvingFieldContainer>
          </SolvingContainer>
        ) : (
          game.gameState === "end" && (
            <EndContainer>
              <SolvingListComponent />

              <EndFieldContainer>
                <EndTitle>
                  {!game.winner
                    ? "왓"
                    : game.winner !== myId
                    ? "패배하셨습니다."
                    : "당신이 승리하셨습니다!"}
                </EndTitle>
                <Answer>정답: {correctWord}</Answer>
                <LobbyButton onClick={back}>돌아가기</LobbyButton>
              </EndFieldContainer>
            </EndContainer>
          )
        )}
        <ChatContainer>
          <Chat>
            <ChatText>
              {chatList.map((chat) => (
                <ChatContent>
                  {game.hostId === chat.userId && (
                    <HostChat>
                      <svg
                        width="100%"
                        height="100%"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M3 7L7.5 12L12 6L16.5 12L21 7V19H3V7Z"
                          fill="#F5C542"
                          stroke="#F5C542"
                          stroke-width="1.5"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </HostChat>
                  )}
                  <Nickname>
                    {chat.nickname ? chat.nickname : "닉네임 없음"}
                    {chat.userId === myId ? "(나)" : ""}
                  </Nickname>
                  <Seperator>|</Seperator>
                  <Message>{chat.message}</Message>
                </ChatContent>
              ))}
              <div ref={chatEndRef} />
            </ChatText>
            <ChatInputContainer>
              <ChatInput
                type="text"
                value={chatText}
                onChange={handleChatTextChange}
                onKeyDown={handleSubmitChatChange}
                placeholder="메시지 입력"
              />
              <ChatButton onClick={submitChat}>제출</ChatButton>
            </ChatInputContainer>
          </Chat>
        </ChatContainer>
      </Section>
    </GamePage>
  );
}
