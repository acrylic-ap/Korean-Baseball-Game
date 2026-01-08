"use client";
import { gameAtom, myIdAtom } from "@/app/atom/gameAtom";
import { useAtom } from "jotai";
import { useState } from "react";
import { styled } from "styled-components";

// Circle

const Circle = styled.div`
  width: 10px;
  height: 10px;

  margin-right: 5px;

  border-radius: 50%;
`;

const WhiteCircle = styled(Circle)`
  background-color: white;
`;

const RedCircle = styled(Circle)`
  background-color: #ff3a3a;
`;

const GreenCircle = styled(Circle)`
  background-color: #76ff44;
`;

const BlueCircle = styled(Circle)`
  background-color: #2e66ff;
`;

const YellowCircle = styled(Circle)`
  background-color: #fdff9b;
`;

const MagentaCircle = styled(Circle)`
  background-color: #ff3d8b;
`;

const CyanCircle = styled(Circle)`
  background-color: #00cfeb;
`;

const GrayCircle = styled(Circle)`
  background-color: #a9aeb0;
`;

const DeepGrayCircle = styled(Circle)`
  background-color: rgb(70, 70, 70);
`;

// End Circle

const SolvingListContainer = styled.div`
  position: relative;

  background-color: rgba(30, 30, 30);

  border-radius: 12px;

  height: 100%;
  width: 35%;

  display: flex;
  flex-direction: column;

  @media screen and (min-width: 768px) {
    width: 20%;
  }
`;

const ButtonContainer = styled.div`
  margin-top: 5px;
  margin-left: 5px;
  margin-bottom: 5px;

  display: flex;
  align-items: center;
  justify-content: center;
`;

const ListButton = styled.button`
  background-color: transparent;

  width: 50%;
  height: 25px;

  border: 1px solid white;
  border-radius: 5px;

  font-size: 9pt;
  color: white;
  font-weight: 300;

  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  &:active {
    background-color: rgba(255, 255, 255, 0.2);
  }

  @media screen and (min-width: 768px) {
    font-size: 11pt;
  }
`;

const GuideButton = styled.svg`
  width: 23px;
  height: 23px;

  border-radius: 50%;

  margin-left: 5px;

  display: flex;
  align-items: center;
  justify-content: center;
`;

const Guide = styled.div`
  position: absolute;
  top: 0;
  left: 0;

  background-color: #151515a1;

  width: 80px;

  padding: 10px;
  border-radius: 5px;

  font-size: 10pt;

  white-space: pre-wrap;
`;

const GuideLine = styled.div`
  display: flex;
  align-items: center;
`;

const SolvingList = styled.div`
  width: 100%;
  height: 90%;

  display: flex;
  flex-direction: column;

  overflow-x: none;
  overflow-y: auto;

  scroll-behavior: auto;

  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const ResultCharContainer = styled.div`
  margin: 5px 10px;

  font-size: 10pt;

  display: flex;
  align-items: flex-start;
  justify-content: flex-start;

  @media screen and (min-width: 768px) {
    font-size: 12pt;
  }
`;

const LongResultCharContainer = styled.div`
  display: flex;
  align-items: flex-start;
  flex-direction: column;
`;

const ShortResultCharContainer = styled.div``;

const ResultChar = styled.span<{
  $type?: string;
}>`
  color: ${({ $type }) =>
    $type === "O"
      ? "white"
      : $type === "@"
      ? "#a9aeb0"
      : $type === "ㄱ"
      ? "#ff3a3a"
      : $type === "ㅏ"
      ? "#76ff44"
      : $type === "ㅁ"
      ? "#2e66ff"
      : $type === "가"
      ? "#fdff9b"
      : $type === "금"
      ? "#ff3d8b"
      : $type === "암"
      ? "#00cfeb"
      : "rgb(70, 70, 70)"};

  font-size: 11pt;

  @media screen and (min-width: 768px) {
    font-size: 13pt;
  }
`;

export const SolvingListComponent = () => {
  const [showMine, setShowMine] = useState(true);
  const [isGuiding, setIsGuiding] = useState(false);

  const [game] = useAtom(gameAtom);
  const [myId] = useAtom<string | null>(myIdAtom);

  if (!game) return null;

  const visibleGuessStack = game.guessStack?.filter((guess) =>
    showMine ? guess.playerId === myId : guess.playerId !== myId
  );

  return (
    <SolvingListContainer>
      <ButtonContainer>
        <ListButton onClick={() => setShowMine(!showMine)}>
          {showMine ? "나" : "상대"}
        </ListButton>
        <GuideButton
          width="100"
          height="100"
          viewBox="0 0 24 24"
          fill="none"
          onClick={() => setIsGuiding(!isGuiding)}
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="12"
            y1="17"
            x2="12.01"
            y2="17"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </GuideButton>
        {isGuiding && (
          <Guide onClick={() => setIsGuiding(!isGuiding)}>
            색 가이드
            <GuideLine>
              <WhiteCircle />
              스트라이크
            </GuideLine>
            <GuideLine>
              <GrayCircle />볼
            </GuideLine>
            <GuideLine>
              <DeepGrayCircle />
              아웃
            </GuideLine>
            <GuideLine>
              <RedCircle />
              초성
            </GuideLine>
            <GuideLine>
              <GreenCircle />
              중성
            </GuideLine>
            <GuideLine>
              <BlueCircle />
              종성
            </GuideLine>
            <GuideLine>
              <YellowCircle />
              초·중성
            </GuideLine>
            <GuideLine>
              <MagentaCircle />
              초·종성
            </GuideLine>
            <GuideLine>
              <CyanCircle />
              중·종성
            </GuideLine>
          </Guide>
        )}
      </ButtonContainer>
      <SolvingList>
        {!showMine && (
          <ResultCharContainer>
            {myId && `✔ ${game?.players?.[myId]?.guessWord}`}
          </ResultCharContainer>
        )}

        {visibleGuessStack?.map((guess, idx) => (
          <ResultCharContainer>
            {guess.word.length < 10 ? (
              <ShortResultCharContainer>
                {guess.word.split("").map((char, index) => (
                  <ResultChar $type={guess.result[index]}>{char}</ResultChar>
                ))}
              </ShortResultCharContainer>
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
  );
};
