"use client";
import { remainingTimeAtom, totalTimeAtom } from "@/app/atom/gameAtom";
import { rtdb } from "@/lib/client";
import { ref } from "firebase/storage";
import { useAtom } from "jotai";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { styled } from "styled-components";

const TurnTime = styled.div<{ $remainingTime: number; $totalTime: number }>`
  position: absolute;
  right: 15px;
  top: 15px;

  width: 30px;
  height: 30px;

  border: 1px solid #9c9c9c;
  border-radius: 50%;

  background: ${({ $remainingTime, $totalTime }) => {
    if (!$totalTime || $totalTime <= 0) return "#1E1E1E"; // 방어 코드

    const ratio = $remainingTime / $totalTime; // 1 → full, 0 → 끝
    const progress = 1 - ratio; // 진행도
    const angle = progress * 360;

    // 비율 기준 색상
    let activeColor = "#696969"; // 여유
    if (ratio <= 0.5) activeColor = "#f59e0b"; // 남은 시간 1/3 이하 → 주황
    if (ratio <= 0.2) activeColor = "#ef4444"; // 남은 시간 15% 이하 → 빨강

    return `
    conic-gradient(
      #1E1E1E 0deg ${angle}deg,
      ${activeColor} ${angle}deg 360deg
    )
  `;
  }};
`;

export const TimerComponent = () => {
  const [remainingTime] = useAtom(remainingTimeAtom);
  const [totalTime] = useAtom(totalTimeAtom);

  if (!remainingTime || !totalTime) return null;

  useEffect(() => {
    if (remainingTime <= 4) {
      const audio = new Audio("/music/SE/alert.mp3");
      audio.play();
    }
  }, [remainingTime]);

  return <TurnTime $remainingTime={remainingTime} $totalTime={totalTime} />;
};
