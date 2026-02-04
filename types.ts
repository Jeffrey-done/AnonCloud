
export type MessageType = 'text' | 'image' | 'video';

export interface Message {
  id: string;
  sender: string;
  time: string;
  type: MessageType;
  content: string; // 文本内容或 Base64 媒体数据
  read: boolean;
  isBurn?: boolean; // 是否为阅后即焚消息
}

export interface ApiResponse<T> {
  code: number;
  msg?: string;
  data?: T;
  roomCode?: string;
  friendCode?: string;
}

export enum TabType {
  ROOM = 'room',
  FRIEND = 'friend',
  SETTINGS = 'settings'
}
