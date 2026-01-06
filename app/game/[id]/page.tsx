"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { rtdb } from "@/lib/client";
import { ref, get, onValue, update, runTransaction } from "firebase/database";
import { styled } from "styled-components";

const GamePage = styled.div`
  background-color: #1a1a1a;

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
  height: 70%;

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

  border-radius: 10px;

  width: 80%;
  height: 50%;

  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const Subtitle = styled.p`
  font-size: 17pt;
  font-weight: 500;

  margin-bottom: 12px;
`;

const DecideWaitTitle = styled(Subtitle)`
  margin-bottom: 0;
`;

const InputContainer = styled.div`
  width: 100%;

  display: flex;
  align-items: center;
  justify-content: center;
`;

const Input = styled.input`
  background-color: transparent;

  width: 30%;
  height: 30px;
  box-sizing: border-box;

  border: 1px solid white;
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
  border-right: none;

  font-size: 13pt;
  color: white;
  text-align: center;

  outline: none;
`;

const SubmitButton = styled.button`
  background-color: #3b82f6;

  border: 1px solid white;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;

  height: 30px;
  width: 45px;
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
  font-size: 15px;
  color: white;

  margin-right: 5px;
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

const SolvingListContainer = styled.div`
  background-color: rgba(30, 30, 30);

  border-radius: 12px 0 0 12px;

  height: 100%;
  width: 25%;

  display: flex;
  flex-direction: column;
`;

const ListButton = styled.button`
  background-color: transparent;

  margin-top: 10px;
  margin-left: 10px;

  width: 65px;
  height: 25px;

  border: 1px solid white;
  border-radius: 5px;

  margin-bottom: 5px;

  color: white;
  font-weight: 300;

  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  &:active {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

const SolvingTitle = styled(Subtitle)`
  white-space: pre-wrap;
`;

const SolvingList = styled.div`
  width: 100%;
  height: 90%;

  display: flex;
  flex-direction: column;

  overflow-x: auto;
  overflow-y: auto;

  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const ResultCharContainer = styled.div`
  margin: 5px 10px;

  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
`;

const LongResultCharContainer = styled.div`
  display: flex;
  align-items: flex-start;
  flex-direction: column;
`;

const ResultChar = styled.span<{ type?: "O" | "@" | "other" }>`
  color: ${({ type }) =>
    type === "O" ? "#3b82f6" : type === "@" ? "#facc15" : "white"};

  font-size: 14px;
`;

const SolvingFieldContainer = styled.div`
  width: 75%;
  height: 100%;

  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
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
`;

const EndTitle = styled(Subtitle)`
  font-size: 20pt;
`;

const Answer = styled.p`
  font-size: 14pt;

  margin-bottom: 10px;
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

interface IPlayer {
  uid: string;
  nickname: string;
  guessWord?: string;
  isDecide?: boolean;
}

interface IGame {
  title: string;
  hostId: string;
  players?: Record<string, IPlayer>; // optional로 처리
  currentOrder?: string;
  winner?: string;
  gameState: "deciding" | "ordering" | "solving" | "end";
  guessStack?: {
    word: string;
    result: string;
    playerId: string;
  }[];
}

export default function GameRoom() {
  const { id } = useParams();
  const router = useRouter();
  const [game, setGame] = useState<IGame | null>(null);
  const [players, setPlayers] = useState<IPlayer[]>([]);

  const [myId, setMyId] = useState<string | null>(null);
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

    const gameRef = ref(rtdb, `games/${id}`);

    get(gameRef).then((snapshot) => {
      const data = snapshot.val() as IGame;

      if (!data) {
        router.replace("/lobby"); // 방이 없으면 로비로
        return;
      }

      const myUserId = localStorage.getItem("userId") || "";

      setMyId(myUserId);

      setGame(data); // 데이터 세팅

      setPlayers(Object.values(data.players ?? []));

      setIsHost(myUserId === data.hostId);
    });
  }, [id, router]);

  useEffect(() => {
    if (!id) return;

    const gameRef = ref(rtdb, `games/${id}`);
    const playerRef = ref(rtdb, `games/${id}/players`);

    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val() as IGame;
      if (!data) return;

      setGame(data);
      setPlayers(Object.values(data.players ?? []));

      if (!isHost) return;

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
              const gameRef = ref(rtdb, `games/${id}`);
              update(gameRef, { gameState: "ordering" });
            }

            return updated;
          });

          break;
        case "ordering":
          const randomIndex = Math.floor(Math.random() * players.length);
          const selectedPlayer = players[randomIndex];

          const gameRef = ref(rtdb, `games/${id}`);
          update(gameRef, {
            currentOrder: selectedPlayer.uid,
            gameState: "solving",
          });
          break;
        case "solving":
          break;
        case "end":
          break;
        default:
          break;
      }
    });
  }, [id, router, isHost]);

  const [decideText, setDecideText] = useState("");

  const handleTextChange = (e: any) => {
    setDecideText(e.target.value);
  };

  const handleSubmitDecideChange = (e: any) => {
    if (e.key === "Enter") {
      submitDecide();
    }
  };

  const submitDecide = () => {
    if (!decideText || decideText.length > 9) return;

    const playerRef = ref(rtdb, `games/${id}/players/${myId}`);

    update(playerRef, { guessWord: decideText, isDecide: "true" });

    setDecideText("");
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

    return result.join("");
  };

  const handleGuessChange = (e: any) => {
    if (e.key === "Enter") {
      guess();
    }
  };

  const guess = () => {
    if (!game) return;

    if (!myId || !game.players) return;

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
      });
    }

    update(gameRef, { currentOrder: nextPlayer.uid });

    setDecideText("");
  };

  const [showMine, setShowMine] = useState(true);

  if (!game) return <div>로딩중...</div>;

  const me = myId ? game.players?.[myId] : null;
  const hasDecided = me?.isDecide;
  const correctWord =
    game.players &&
    Object.values(game.players).find((p) => p.uid !== myId)?.guessWord;

  const visibleGuessStack = game.guessStack?.filter((guess) =>
    showMine ? guess.playerId === myId : guess.playerId !== myId
  );

  return (
    <GamePage>
      <Header></Header>
      <Section>
        <Title>{game.title}</Title>
        {game.gameState === "deciding" ? (
          <GameContainer>
            {!hasDecided ? (
              <>
                <Subtitle>상대방이 맞힐 단어를 정해 주세요!</Subtitle>
                <InputContainer>
                  <Input
                    type="text"
                    value={decideText}
                    onChange={handleTextChange}
                    onKeyDown={handleSubmitDecideChange}
                    maxLength={9}
                  />
                  <SubmitButton onClick={submitDecide}>완료</SubmitButton>
                </InputContainer>
              </>
            ) : (
              <DecideWaitTitle>상대방을 기다리고 있어요...</DecideWaitTitle>
            )}

            <PlayerDecidedContainer>
              {players.map((p) => (
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
            <SolvingListContainer>
              <ListButton onClick={() => setShowMine(!showMine)}>
                {showMine ? "내 기록" : "상대 기록"}
              </ListButton>
              <SolvingList>
                {visibleGuessStack?.map((guess, idx) => (
                  <ResultCharContainer>
                    {guess.word.length < 10 ? (
                      guess.word
                        .split("")
                        .map((char, index) => (
                          <ResultChar
                            type={
                              guess.result[index] === "O"
                                ? "O"
                                : guess.result[index] === "@"
                                ? "@"
                                : "other"
                            }
                          >
                            {char}
                          </ResultChar>
                        ))
                    ) : (
                      <LongResultCharContainer>
                        <ResultChar>{guess.word}</ResultChar>
                        <ResultChar>{guess.result}</ResultChar>
                      </LongResultCharContainer>
                    )}
                  </ResultCharContainer>
                ))}
              </SolvingList>
            </SolvingListContainer>

            <SolvingFieldContainer>
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
                </>
              ) : (
                <>
                  <SolvingTitle>
                    {`잠시만 기다려 주세요, 
상대가 단어를 고르고 있어요.`}
                  </SolvingTitle>
                </>
              )}
            </SolvingFieldContainer>
          </SolvingContainer>
        ) : (
          game.gameState === "end" && (
            <EndContainer>
              <SolvingListContainer>
                <ListButton onClick={() => setShowMine(!showMine)}>
                  {showMine ? "내 기록" : "상대 기록"}
                </ListButton>
                <SolvingList>
                  {visibleGuessStack?.map((guess, idx) => (
                    <ResultCharContainer>
                      {guess.word.length < 10 ? (
                        guess.word
                          .split("")
                          .map((char, index) => (
                            <ResultChar
                              type={
                                guess.result[index] === "O"
                                  ? "O"
                                  : guess.result[index] === "@"
                                  ? "@"
                                  : "other"
                              }
                            >
                              {char}
                            </ResultChar>
                          ))
                      ) : (
                        <LongResultCharContainer>
                          <ResultChar>{guess.word}</ResultChar>
                          <ResultChar>{guess.result}</ResultChar>
                        </LongResultCharContainer>
                      )}
                    </ResultCharContainer>
                  ))}
                </SolvingList>
              </SolvingListContainer>

              <EndFieldContainer>
                <EndTitle>
                  {!game.winner
                    ? "왓"
                    : game.winner !== myId
                    ? "패배하셨습니다."
                    : "당신이 승리하셨습니다!"}
                </EndTitle>
                <Answer>정답: {correctWord}</Answer>
                <LobbyButton onClick={() => router.replace("/lobby")}>
                  돌아가기
                </LobbyButton>
              </EndFieldContainer>
            </EndContainer>
          )
        )}
      </Section>
    </GamePage>
  );
}
