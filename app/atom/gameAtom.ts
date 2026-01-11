import { atom } from "jotai"

export interface IUser {
  uid: string;
  nickname: string;
  lastActive: number;
}

export interface IPlayer {
  joinedAt: number;
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
  requestBack?: Record<string, boolean>;
  guessStack?: {
    word: string;
    result: string;
    playerId: string;
  }[];
  remainingTime?: number;
  time: string;
  spectators?: {
    userId: string;
  }
  max: number;
  locked: boolean;
  hostNickname: string;
}

export const myIdAtom = atom<string | null>(null);
export const gameAtom = atom<IGame | null>(null);
export const myUserInfoAtom = atom<IUser | null>(null);
export const remainingTimeAtom = atom<number | null>(null);
export const totalTimeAtom = atom<number | null>(null);