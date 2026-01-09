import React, { InputHTMLAttributes, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { push, ref, set, serverTimestamp } from "firebase/database";
import { rtdb } from "@/lib/client";
import { useRouter } from "next/navigation";
import { isCreateOpenAtom } from "@/app/atom/roomCreateModalAtom";
import { useAtom } from "jotai";

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

const OptionRow = styled.label`
  display: flex;
  align-items: center;
  justify-content: flex-end;

  gap: 6px;

  font-size: 10pt;
  margin-bottom: 15px;

  cursor: pointer;
`;

const Checkbox = styled.input`
  accent-color: #3b82f6;
`;

export const RoomCreateModal = ({
  userId,
  nickname,
}: {
  userId: string;
  nickname: string;
}) => {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useAtom(isCreateOpenAtom);
  const [locked, setLocked] = useState(false);

  const handleCreate = async () => {
    setLoading(true);

    const newRoomRef = push(ref(rtdb, "rooms"));

    await set(newRoomRef, {
      title: title.trim() ? title : `${nickname} 님의 방`,
      current: 1,
      max: 2,
      hostId: userId,
      hostNickname: nickname,
      gameState: "waiting",
      createdAt: serverTimestamp(),
      players: {
        [userId]: {
          uid: userId,
          nickname,
          joinedAt: serverTimestamp(),
        },
      },
      locked: locked,
    });

    setIsCreateOpen(false);

    router.replace(`/room/${newRoomRef.key}`);
  };

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [isCreateOpen]);

  if (!isCreateOpen) return false;

  return (
    <Overlay onClick={() => setIsCreateOpen(false)}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>방 만들기</Title>

        <Input
          placeholder="방 제목을 입력하세요"
          value={title}
          maxLength={20}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          ref={inputRef}
        />

        <OptionRow>
          <Checkbox
            type="checkbox"
            checked={locked}
            onChange={(e) => setLocked(e.target.checked)}
          />
          중도 입장 불가
        </OptionRow>

        <ButtonRow>
          <Button onClick={() => setIsCreateOpen(false)}>취소</Button>
          <Button $primary onClick={handleCreate} disabled={loading}>
            생성
          </Button>
        </ButtonRow>
      </Modal>
    </Overlay>
  );
};
