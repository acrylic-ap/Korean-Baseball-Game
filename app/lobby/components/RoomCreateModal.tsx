import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { push, ref, set, serverTimestamp } from "firebase/database";
import { rtdb } from "@/lib/client";
import { useRouter } from "next/navigation";
import { isCreateOpenAtom } from "@/app/atom/modalAtom";
import { useAtom } from "jotai";
import Select from "react-dropdown-select";

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

const TimeRow = styled.div`
  display: flex;
  align-items: center;

  font-size: 11pt;

  margin-bottom: 5px;
`;

const TimeSelect = styled(Select)`
  border: 1px solid #444;
  border-radius: 8px;

  color: white;
  font-size: 14px;

  &,
  &:focus-within {
    border-color: #676767 !important;
    box-shadow: none !important;
    outline: none !important;
  }

  .react-dropdown-select-content {
    width: 100%;
    height: 100%;

    font-size: 10pt;

    display: flex;

    margin-left: 5px;

    cursor: pointer;
  }

  .react-dropdown-select-dropdown {
    background: #1a1a1a;

    border-color: #676767;
  }

  .react-dropdown-select-item {
    padding: 10px 12px;

    border-color: #676767;

    cursor: pointer;

    font-size: 13px;

    &:hover {
      background: #2a2a2a;
    }
  }

  .react-dropdown-select-item-selected {
    border: 1px solid #676767 !important;
    background: #575757 !important; /* 배경색 (예: 연한 빨강) */
    color: #fff !important; /* 글자색 */
  }
`;

const TimeText = styled.p`
  margin-right: 10px;
`;

const OptionRow = styled.label`
  display: flex;
  align-items: center;
  justify-content: flex-end;

  gap: 3px;

  font-size: 11pt;
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

  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);

  const [title, setTitle] = useState("");
  const [time, setTime] = useState<any[]>([
    { label: "기본", value: "default" },
  ]);

  const [isCreateOpen, setIsCreateOpen] = useAtom(isCreateOpenAtom);

  // 자동 포커싱
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [isCreateOpen]);

  // 방 생성
  const handleCreate = async () => {
    setLoading(true);

    const newRoomRef = push(ref(rtdb, "rooms"));

    await set(newRoomRef, {
      title: title.trim() ? title : `${nickname} 님의 방`,
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
      time: time[0].value,
      locked: locked,
    });

    setIsCreateOpen(false);

    router.replace(`/room/${newRoomRef.key}`);
  };

  if (!isCreateOpen) return false;

  const options = [
    { value: "speedy", label: "타임 어택" },
    { value: "default", label: "기본" },
    { value: "infinity", label: "무제한" },
  ];

  return (
    <Overlay onClick={() => setIsCreateOpen(false)}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>방 만들기</Title>

        <Input
          placeholder="방 제목을 입력하세요"
          value={title}
          maxLength={13}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          ref={inputRef}
        />

        <TimeRow>
          <TimeText>시간 설정</TimeText>
          <TimeSelect
            style={{ width: "100px" }}
            options={options}
            values={time}
            onChange={(values) => setTime(values)}
            searchable={false}
            backspaceDelete={false}
          />
        </TimeRow>

        <OptionRow>
          중도 입장 불가
          <Checkbox
            type="checkbox"
            checked={locked}
            onChange={(e) => setLocked(e.target.checked)}
          />
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
