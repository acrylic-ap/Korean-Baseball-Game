import { atom } from "jotai"

export interface IUser {
  uid: string;
  nickname: string;
  lastActive: number;
}

export interface IPlayer {
  uid: string;
  nickname: string;
  guessWord?: string;
  isDecide?: boolean;
  penaltyStack?: number;
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
  spectators?: {
    userId: string;
  }
}

export const myIdAtom = atom<string | null>(null);
export const gameAtom = atom<IGame | null>(null);
export const myUserInfoAtom = atom<IUser | null>(null);
export const remainingTimeAtom = atom<number | null>(null);