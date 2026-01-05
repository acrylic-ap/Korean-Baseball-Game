"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { rtdb } from "@/lib/firebase";
import { ref, get, onValue, update, runTransaction } from "firebase/database";

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
}

export default function GameRoom() {
  const { id } = useParams();
  const router = useRouter();
  const [game, setGame] = useState<IGame | null>(null);
  const [players, setPlayers] = useState<IPlayer[]>([]);

  const [myId, setMyId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);

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
      if (!decideText || decideText.length > 9) return;

      const playerRef = ref(rtdb, `games/${id}/players/${myId}`);

      update(playerRef, { guessWord: decideText, isDecide: "true" });

      setDecideText("");
    }
  };

  const [guessStack, setGuessStack] = useState<
    { word: string; result: string }[]
  >([]);

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
    const max = Math.max(t.length, c.length);

    const result = Array(max).fill("?");
    const remain: Record<string, number> = {};

    // targetWord 글자 개수 카운트
    for (const ch of t) {
      remain[ch] = (remain[ch] || 0) + 1;
    }

    // 1️⃣ 정확히 일치 (O)
    for (let i = 0; i < max; i++) {
      if (t[i] && c[i] && t[i] === c[i]) {
        result[i] = "O";
        remain[c[i]]--;
      }
    }

    // 2️⃣ 포함 여부 (@ / X)
    for (let i = 0; i < max; i++) {
      if (result[i] !== "?") continue;

      const ch = c[i];
      if (ch && remain[ch] > 0) {
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
        setGuessStack((prev) => [
          ...prev,
          {
            word: decideText,
            result: resultWord(nextPlayer.guessWord!, decideText),
          },
        ]);
      }

      update(gameRef, { currentOrder: nextPlayer.uid });

      setDecideText("");
    }
  };

  if (!game) return <div>로딩중...</div>;

  const me = myId ? game.players?.[myId] : null;
  const hasDecided = me?.isDecide;

  return (
    <div>
      <h1>{game.title}</h1>
      {game.gameState === "deciding" ? (
        <div>
          {!hasDecided && (
            <>
              <p>단어를 정해 주세요!</p>
              <input
                type="text"
                value={decideText}
                onChange={handleTextChange}
                onKeyDown={handleSubmitDecideChange}
              />
            </>
          )}
          {players.map((p) => (
            <li key={p.uid}>
              {p.nickname}
              {p.uid === myId && "(나)"}: {p.isDecide ? "완료" : "미완료"}
            </li>
          ))}
        </div>
      ) : game.gameState === "solving" ? (
        <div>
          <div>
            {guessStack.map((guess, idx) => (
              <>
                <p key={idx}>{guess.word}</p>
                <p key={idx}>{guess.result}</p>
              </>
            ))}
          </div>

          {myId && game.currentOrder === myId ? (
            <>
              <p>단어를 입력해 주세요!</p>
              <input
                type="text"
                value={decideText}
                onChange={handleTextChange}
                onKeyDown={handleGuessChange}
              />
            </>
          ) : (
            <>
              <p>잠시만 기다려 주세요, 상대가 단어를 고르고 있어요.</p>
            </>
          )}
        </div>
      ) : (
        game.gameState === "end" && (
          <div>
            {!game.winner
              ? "왓"
              : game.winner !== myId
              ? "너 짐 수고"
              : "올 이겼네"}
          </div>
        )
      )}
    </div>
  );
}
