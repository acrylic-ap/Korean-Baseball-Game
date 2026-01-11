import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import {
  get,
  push,
  ref,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { rtdb } from "@/lib/client";
import { useRouter } from "next/navigation";
import { isLoginOpenAtom } from "@/app/atom/modalAtom";
import { useAtom } from "jotai";
import Select from "react-dropdown-select";
import { GoogleLogo } from "@/public/svg/LobbySVG";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/client";
import { nicknameAtom } from "@/app/atom/lobbyAtom";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  width: 320px;
  background: #1f1f1f;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);

  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const Title = styled.h2`
  font-size: 16pt;
  margin-bottom: 20px;
  text-align: center;
`;

const GoogleLoginButton = styled.button`
  width: 200px;
  height: 40px;

  border: none;
  border-radius: 3px;

  display: flex;
  justify-content: center;
  align-items: center;

  &:disabled {
    color: white;
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const GoogleLogoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;

  margin-right: 5px;
`;

const GoogleText = styled.p``;

export const LoginModal = () => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [nickname, setNickname] = useAtom(nicknameAtom);

  const [isLoginOpen, setIsLoginOpen] = useAtom(isLoginOpenAtom);

  // 자동 포커싱
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [isLoginOpen]);

  // 방 생성
  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const user = result.user;

      // 로컬 저장 (기존 로직 유지)
      localStorage.setItem("userId", user.uid);

      // 🔥 users/{uid} 레퍼런스
      const userRef = ref(rtdb, `users/${user.uid}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        // 최초 로그인
        localStorage.setItem("userNickname", "닉네임 없음");
        setNickname("닉네임 없음");

        await set(userRef, {
          uid: user.uid,
          nickname: "닉네임 없음",
          email: user.email || null,
          photoURL: user.photoURL || null,
          provider: "google",
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        });
      } else {
        // 재로그인
        await update(userRef, {
          lastLoginAt: serverTimestamp(),
          nickname: user.displayName || "익명",
          photoURL: user.photoURL || null,
        });
      }

      setIsLoginOpen(false);
      router.replace("/lobby");
    } catch (err) {
      console.error("Google login failed", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoginOpen) return false;

  return (
    <Overlay onClick={() => setIsLoginOpen(false)}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>로그인</Title>

        <GoogleLoginButton onClick={handleGoogleLogin} disabled={loading}>
          <GoogleLogoContainer>
            <GoogleLogo />
          </GoogleLogoContainer>
          <GoogleText>Sign in with Google</GoogleText>
        </GoogleLoginButton>
      </Modal>
    </Overlay>
  );
};
