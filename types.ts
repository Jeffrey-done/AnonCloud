
export interface Message {
  time: string;
  content: string;
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
