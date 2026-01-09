"use client";
import { remainingTimeAtom } from "@/app/atom/gameAtom";
import { rtdb } from "@/lib/client";
import { ref } from "firebase/storage";
import { useAtom } from "jotai";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { styled } from "styled-components";

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

export const TimerComponent = () => {
  const [remainingTime] = useAtom(remainingTimeAtom);

  if (!remainingTime) return null;

  return <TurnTime $remainingTime={remainingTime} />;
};
