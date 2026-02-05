
export type MessageType = 'text' | 'image' | 'video' | 'audio';

export interface Message {
  id: string;
  sender: string;
  time: string;
  timestamp: number;
  type: MessageType;
  content: string; // 文本内容或 Base64 媒体数据
  read: boolean;
  burn?: boolean; // 阅后即焚标记
}

export interface SavedRoom {
  code: string;
  pass: string;
  lastUsed: number;
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
