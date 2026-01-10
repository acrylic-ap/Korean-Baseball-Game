import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { ref, set } from "firebase/database";
import { rtdb } from "@/lib/client";
import { isNicknameOpenAtom } from "@/app/atom/modalAtom";
import { useAtom } from "jotai";
import { levenshtein } from "../tools/Levenshtein";
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

const Input = styled.input`
  width: 90%;
  height: 36px;
  border-radius: 6px;
  border: 1px solid #555;
  background: #2a2a2a;
  color: white;
  padding: 0 10px;
  margin-bottom: 15px;
  outline: none;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
`;

const Button = styled.button<{ $primary?: boolean }>`
  flex: 1;
  height: 36px;

  padding: 0 20px;

  border-radius: 6px;
  border: none;

  cursor: pointer;
  font-size: 11pt;

  background: ${({ $primary }) => ($primary ? "#3b82f6" : "#444")};
  color: white;

  &:hover {
    background: ${({ $primary }) => ($primary ? "#2563eb" : "#555")};
  }
`;

export const ChangeNicknameModal = ({ userId }: { userId: string }) => {
  // useState
  const [loading, setLoading] = useState(false);

  const [changeNickname, setChangeNickname] = useState<string>("");

  // Variable Atom
  const [nickname, setNickname] = useAtom(nicknameAtom);

  // Modal Atom
  const [isNicknameOpen, setIsNicknameOpen] = useAtom(isNicknameOpenAtom);

  // 자동 포커싱
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [isNicknameOpen]);

  // 닉네임 변경
  const handleNicknameChange = async () => {
    // 체크용 공백 제거
    const check = changeNickname.trim();

    // 닉네임 공란 prevent
    if (!check) {
      alert("닉네임을 입력하세요.");
      return;
    }

    // 본인이 이미 사용 중인 닉네임인 경우
    if (check === nickname) {
      alert("설정한 닉네임과 현재 닉네임이 같습니다.");
      return;
    }

    // 한글, 숫자, 영어 제약
    if (!/^[가-힣a-zA-Z0-9]+$/.test(check)) {
      alert("닉네임에는 영어, 한글, 숫자만 사용할 수 있습니다.");
      return;
    }

    // 운영자 닉네임 제약
    const forbidden = ["acrylic", "아크릴릭"];
    const normalized = check.toLowerCase();
    const isForbidden = forbidden.some(
      (word) => levenshtein(word, normalized) <= 2
    );
    if (isForbidden) {
      alert("운영자를 굉장히 존경하시나 보네요?");
      return;
    }

    // 중복 클릭 방지
    setLoading(true);

    // 닉네임 적용
    localStorage.setItem("userNickname", check);

    const nicknameRef = ref(rtdb, `users/${userId}/nickname`);
    await set(nicknameRef, check);

    setNickname(check);

    // 팝업 종료
    setIsNicknameOpen(false);
  };

  // 팝업이 꺼져 있는 경우 감춤
  if (!isNicknameOpen) return false;

  return (
    <Overlay onClick={() => setIsNicknameOpen(false)}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>닉네임 변경</Title>

        <Input
          placeholder="변경할 닉네임을 입력하세요"
          value={changeNickname}
          onChange={(e) => setChangeNickname(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleNicknameChange()}
          maxLength={7}
          ref={inputRef}
        />

        <ButtonRow>
          <Button onClick={() => setIsNicknameOpen(false)}>취소</Button>
          <Button $primary onClick={handleNicknameChange} disabled={loading}>
            수정
          </Button>
        </ButtonRow>
      </Modal>
    </Overlay>
  );
};
