export interface Message {
  id?: string;
  text: string;
  own: boolean;
  status: 'loading' | 'sent' | 'error' | 'received'; 
  timestamp?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
}

export const testUser: User = {
  id: "0",
  username: "@test",
  name: "Тестовый пользователь",
};