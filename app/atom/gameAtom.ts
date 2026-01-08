import { atom } from "jotai"

export interface IPlayer {
  uid: string;
  nickname: string;
  guessWord?: string;
  isDecide?: boolean;
}

export interface IGame {
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
  remainingTime?: number;
}

export const myIdAtom = atom<string | null>(null);
export const gameAtom = atom<IGame | null>(null);