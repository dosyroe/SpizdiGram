import { useEffect, useRef, useState, useCallback } from "react";
import api from "../types/api";
import ChatSidebar from "../components/ChatSidebar";
import ChatMessages from "../components/ChatMessages";
import ChatInput from "../components/ChatInput";
import type { User, Message } from "../types";
import { testUser } from "../types";
import "../index.css";
import { useParams, useNavigate } from "react-router-dom";

const testChatUser: ChatUser = {
  ...testUser,
  chatId: "0",
  userName1: testUser.username || "@default1",
  userName2: "@default2",
};

interface SearchResult {
  username: string;
  name: string;
}

interface ChatResponse {
  id: number;
  userName1: string;
  userName2: string;
  nameChat: string;
}

interface GetChatResponse {
  chats: ChatResponse[];
  jwt?: string;
}

interface ChatHistoryResponse {
  history: { name: string; content: string }[];
  jwt?: string;
}

interface ChatUser extends User {
  chatName?: string;
  chatId: string;
  userName1: string;
  userName2: string;
}

interface UserInfoResponse {
  name: string;
  login: string;
  jwt: string;
}

interface WsMessage {
  chatId: number;
  fromUser: string;
  toUser: string;
  content: string;
}

interface WebSocketManager {
  connect: () => void;
  send: (message: WsMessage) => void;
  close: () => void;
}

const createWebSocketManager = (
  url: string,
  onMessage: (data: WsMessage) => void,
  onOpen: () => void,
  onError: (error: Event) => void,
  onClose: () => void
): WebSocketManager => {
  let socket: WebSocket | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectInterval = 3000;
  let isConnecting = false;

  const connect = () => {
    if (isConnecting || socket?.readyState === WebSocket.OPEN) {
      console.log("🔄 WebSocket уже активен или подключается, пропускаем");
      return;
    }

    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.CLOSING)) {
      console.log("🔄 Ожидание завершения текущего подключения...");
      return;
    }

    isConnecting = true;
    socket = new WebSocket(url);
    console.log("🔗 Инициализация WebSocket:", url);

    socket.onopen = () => {
      console.log("✅ WebSocket открыт");
      reconnectAttempts = 0;
      isConnecting = false;
      onOpen();
    };

    socket.onmessage = (event) => {
      try {
        const data: WsMessage = JSON.parse(event.data);
        console.log("📥 Получено сообщение от сервера:", data);
        onMessage(data);
      } catch (error) {
        console.error("❌ Ошибка при разборе сообщения:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("❌ WebSocket ошибка:", error);
      onError(error);
      isConnecting = false;
    };

    socket.onclose = (event) => {
      console.warn("🔌 WebSocket закрыт, код:", event.code, "причина:", event.reason);
      socket = null;
      isConnecting = false;
      onClose();
      if (event.code !== 1000 || event.reason !== "Duplicate connection") {
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`🔄 Планируется переподключение (попытка ${reconnectAttempts}/${maxReconnectAttempts})...`);
          setTimeout(connect, reconnectInterval);
        } else {
          console.error("❌ Превышено максимальное количество попыток переподключения");
        }
      }
    };
  };

  const send = (message: WsMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      console.log("📤 Сообщение отправлено на сервер:", message);
    } else {
      console.warn("⚠️ WebSocket не открыт, сообщение не отправлено");
    }
  };

  const close = () => {
    if (socket) {
      socket.close(1000, "Manual close");
      socket = null;
      console.log("🔒 WebSocket закрыт вручную");
    }
  };

  return { connect, send, close };
};

export default function Home() {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [selectedUser, setSelectedUser] = useState<ChatUser | SearchResult | null>(null);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [modalUser, setModalUser] = useState<ChatUser | SearchResult | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const prevSearchRef = useRef<string>("");
  const isInitialMount = useRef(true);
  const hasFetchedHistory = useRef<Record<string, boolean>>({});
  const messageIdCounter = useRef<number>(0);
  const wsManager = useRef<WebSocketManager | null>(null);
  const isFetchingChats = useRef(false);
  const hasFetchedChats = useRef(false);

  const fetchUserInfo = useCallback(async () => {
    const currentUser = localStorage.getItem("name");
    const jwt = localStorage.getItem("jwt");
    if (!currentUser || !jwt) {
      console.warn("⚠️ Нет данных пользователя или JWT в localStorage");
      return false;
    }

    try {
      console.log("Отправка запроса на /users/GetUserinfo");
      const res = await api.get<UserInfoResponse>("/users/GetUserinfo", {
        params: { Name: currentUser, JWT: jwt },
      });
      console.log("Получены данные пользователя:", res.data);

      localStorage.setItem("name", res.data.name);
      localStorage.setItem("login", res.data.login);
      if (res.data.jwt) localStorage.setItem("jwt", res.data.jwt);
      return true;
    } catch (error) {
      console.error("Ошибка при получении информации о пользователе:", error);
      return false;
    }
  }, []);

  const fetchChats = useCallback(async () => {
    if (isFetchingChats.current) {
      console.log("🔄 fetchChats пропущен: уже выполняется");
      return;
    }
    isFetchingChats.current = true;
    console.log("Запуск fetchChats");
    const currentUser = localStorage.getItem("name");
    const jwt = localStorage.getItem("jwt");
    console.log("currentUser:", currentUser, "jwt:", jwt);

    if (!currentUser) {
      console.warn("⚠️ Имя пользователя не найдено в localStorage");
      setChatUsers([testChatUser]);
      setSelectedUser(testChatUser);
      isFetchingChats.current = false;
      return;
    }

    try {
      console.log("Отправка запроса на /users/getChat");
      const res = await api.get<GetChatResponse>("/users/getChat", {
        params: { Name: currentUser, JWT: jwt },
      });
      console.log("Получены данные чатов:", res.data.chats);

      const chats: ChatUser[] = res.data.chats.map((chat: ChatResponse) => ({
        id: chat.id.toString(),
        username: chat.nameChat.startsWith("@") ? chat.nameChat : `@${chat.nameChat}`,
        name: chat.nameChat,
        chatName: chat.nameChat,
        chatId: chat.id.toString(),
        userName1: chat.userName1.startsWith("@") ? chat.userName1 : `@${chat.userName1}`,
        userName2: chat.userName2.startsWith("@") ? chat.userName2 : `@${chat.userName2}`,
      }));

      console.log("Сформированные чаты:", chats);

      const chatMap: { [key: string]: number } = {};
      res.data.chats.forEach((chat: ChatResponse) => {
        const chatUsername = chat.nameChat.startsWith("@") ? chat.nameChat : `@${chat.nameChat}`;
        chatMap[chatUsername] = chat.id;
      });
      localStorage.setItem("chatMap", JSON.stringify(chatMap));
      console.log("Сформирован chatMap:", chatMap);

      if (res.data.jwt) localStorage.setItem("jwt", res.data.jwt);

      setChatUsers(chats.length > 0 ? chats : [testChatUser]);
      if (chats.length > 0 && !selectedUser) setSelectedUser(chats[0]);
      else if (chats.length === 0 && !selectedUser) setSelectedUser(testChatUser);
    } catch (error) {
      console.error("Ошибка при получении чатов:", error);
      setChatUsers([testChatUser]);
      setSelectedUser(testChatUser);
    } finally {
      isFetchingChats.current = false;
      hasFetchedChats.current = true;
    }
  }, [selectedUser]);

  const generateUniqueId = useCallback((): string => {
    const timestamp = Date.now();
    const counter = messageIdCounter.current++;
    return `${timestamp}-${counter}`;
  }, []);

  const handleWsMessage = useCallback(
    (messageData: WsMessage) => {
      const fromUser = messageData.fromUser;
      const toUser = messageData.toUser;

      if (fromUser === currentUsername) {
        console.log("⏩ Пропускаем своё сообщение для отображения");
        return;
      }

      const targetUsername = selectedUser ? selectedUser.username : toUser;
      setMessagesMap((prev) => ({
        ...prev,
        [targetUsername]: [
          ...(prev[targetUsername] || []),
          {
            text: messageData.content,
            own: false,
            status: "received",
            id: generateUniqueId(),
            timestamp: new Date().toISOString(),
          },
        ],
      }));
    },
    [selectedUser, generateUniqueId, currentUsername]
  );

  useEffect(() => {
    setCurrentUsername(localStorage.getItem("name"));
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const isPageReload = performance.navigation.type === performance.navigation.TYPE_RELOAD;
      if (isPageReload && username) {
        navigate("/", { replace: true });
      }

      const userInfoFetched = await fetchUserInfo();
      if (userInfoFetched && !hasFetchedChats.current) {
        await fetchChats();
      } else if (!userInfoFetched) {
        console.warn("⚠️ Не удалось получить данные пользователя, загрузка чатов отменена");
        setChatUsers([testChatUser]);
        setSelectedUser(testChatUser);
      }
    };

    initialize();
  }, [navigate, username, fetchUserInfo, fetchChats]);

  useEffect(() => {
    if (!currentUsername) return;

    const jwt = localStorage.getItem("jwt");
    const wsUrl = jwt
      ? `wss://localhost:8080/ws/chat?username=${currentUsername}&token=${jwt}`
      : `wss://localhost:8080/ws/chat?username=${currentUsername}`;

    if (wsManager.current) {
      wsManager.current.close();
    }

    wsManager.current = createWebSocketManager(
      wsUrl,
      handleWsMessage,
      () => console.log("✅ WebSocket подключён"),
      (error) => console.error("❌ WebSocket ошибка:", error),
      () => console.log("🔌 WebSocket закрыт")
    );

    const initialDelay = setTimeout(() => wsManager.current?.connect(), 1000);

    return () => {
      clearTimeout(initialDelay);
      if (wsManager.current) {
        wsManager.current.close();
      }
    };
  }, [handleWsMessage, currentUsername]);

  const fetchChatHistory = useCallback(async (chatId: number, username: string) => {
    const currentUser = localStorage.getItem("name");
    const jwt = localStorage.getItem("jwt");
    if (!currentUser || !chatId) {
      console.warn("⚠️ Не удалось получить историю чата: отсутствуют параметры");
      return;
    }

    try {
      const res = await api.get("/app/chats/ChatHistory", {
        params: { ChatId: chatId, Name: currentUser, JWT: jwt },
      });
      const data: ChatHistoryResponse = res.data;
      console.log("Получена история чата для", username, ":", data.history);

      if (data.jwt) localStorage.setItem("jwt", data.jwt);

      const historyMessages: Message[] = data.history.map((msg, index) => ({
        text: msg.content,
        own: msg.name === currentUser,
        status: "received",
        id: `history-${index}-${Date.now()}-${messageIdCounter.current++}`,
        timestamp: new Date().toISOString(),
      }));

      setMessagesMap((prev) => ({
        ...prev,
        [username]: historyMessages,
      }));
    } catch (error) {
      console.error("Ошибка при получении истории чата:", error);
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      if (username) {
        const cleanUsername = username.startsWith("@") ? username : `@${username}`;
        setSelectedUser({ username: cleanUsername, name: cleanUsername.replace(/^@/, ""), chatId: "0", userName1: "", userName2: "" });

        const chatMapStr = localStorage.getItem("chatMap");
        if (chatMapStr && !hasFetchedHistory.current[cleanUsername]) {
          const chatMap = JSON.parse(chatMapStr);
          const chatId = chatMap[cleanUsername];
          if (chatId) {
            fetchChatHistory(chatId, cleanUsername);
            hasFetchedHistory.current[cleanUsername] = true;
          }
        }
      }
      isInitialMount.current = false;
    } else if (username && selectedUser?.username !== username) {
      const cleanUsername = username.startsWith("@") ? username : `@${username}`;
      setSelectedUser({ username: cleanUsername, name: cleanUsername.replace(/^@/, ""), chatId: "0", userName1: "", userName2: "" });

      const chatMapStr = localStorage.getItem("chatMap");
      if (chatMapStr && !hasFetchedHistory.current[cleanUsername]) {
        const chatMap = JSON.parse(chatMapStr);
        const chatId = chatMap[cleanUsername];
        if (chatId) {
          fetchChatHistory(chatId, cleanUsername);
          hasFetchedHistory.current[cleanUsername] = true;
        }
      }
    }
  }, [username, fetchChatHistory, selectedUser?.username]);

  useEffect(() => {
    if (!search) {
      setIsSearching(false);
      setSearchResults([]);
      prevSearchRef.current = search;
      return;
    }

    if (search !== prevSearchRef.current) {
      setIsSearching(true);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);

      searchTimeout.current = setTimeout(() => {
        const currentUser = localStorage.getItem("name");
        api
          .get("/users/Search", {
            params: { Parametr: search, Name: currentUser },
          })
          .then((res) => {
            const found: string[] = Array.isArray(res.data) ? res.data : [];
            const searchResults = found
              .filter((username) => {
                const cleanUsername = username.startsWith("@") ? username : `@${username}`;
                return cleanUsername !== currentUser;
              })
              .map((username) => ({
                username: username.startsWith("@") ? username : `@${username}`,
                name: username.replace(/^@/, ""),
              }));
            setSearchResults(searchResults);
            setSelectedUser(searchResults[0] || null);
          })
          .catch((error) => {
            console.error("Ошибка при поиске пользователей:", error);
            setSearchResults([]);
            setSelectedUser(null);
          })
          .finally(() => setIsSearching(false));
      }, 400);
    }

    prevSearchRef.current = search;

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search]);

  const handleRefreshChats = useCallback(async () => {
    if (!isSearching && !search) {
      await fetchChats();
    }
  }, [isSearching, search, fetchChats]);

  const handleCreateChat = async (recipientUsername: string) => {
    const currentUser = localStorage.getItem("name");
    const jwt = localStorage.getItem("jwt");
    if (!currentUser) return;

    try {
      await api.post("/app/chats/createchat", {
        name: currentUser,
        userName1: currentUser,
        userName2: recipientUsername,
        jwt: jwt,
      });
      setModalUser(null);
      await handleRefreshChats();
      const cleanUsername = recipientUsername.startsWith("@") ? recipientUsername : `@${recipientUsername}`;
      navigate(`/chat/${cleanUsername}`);
    } catch (error) {
      console.error("Ошибка при создании чата:", error);
    }
  };

  const sendMessage = () => {
    if (!input.trim() || !selectedUser || !wsManager.current) {
      console.warn("⚠️ Сообщение не отправлено: отсутствуют необходимые данные", {
        input,
        selectedUser,
        wsManager: wsManager.current,
      });
      return;
    }

    const currentUser = currentUsername;
    if (!currentUser) {
      console.warn("⚠️ Текущий пользователь не определён");
      return;
    }

    const chatMapStr = localStorage.getItem("chatMap");
    if (!chatMapStr) {
      console.warn("⚠️ chatMap не найден в localStorage");
      return;
    }

    const chatMap = JSON.parse(chatMapStr);
    const chatId = chatMap[selectedUser.username];
    if (!chatId) {
      console.warn("⚠️ chatId не найден для пользователя:", selectedUser.username);
      return;
    }

    let recipientUsername: string;
    if ("userName2" in selectedUser && "userName1" in selectedUser) {
      recipientUsername = selectedUser.userName2 === currentUser ? selectedUser.userName1 : selectedUser.userName2;
    } else {
      recipientUsername = selectedUser.username;
    }

    if (recipientUsername === currentUser) {
      console.warn("⚠️ Нельзя отправить сообщение самому себе:", currentUser);
      return;
    }

    const message: WsMessage = {
      chatId: parseInt(chatId),
      fromUser: currentUser,
      toUser: recipientUsername,
      content: input,
    };

    console.log("Отправляем сообщение:", message);
    wsManager.current.send(message);

    setMessagesMap((prev) => ({
      ...prev,
      [selectedUser.username]: [
        ...(prev[selectedUser.username] || []),
        {
          text: input,
          own: true,
          status: "sent",
          id: generateUniqueId(),
          timestamp: new Date().toISOString(),
        },
      ],
    }));
    setInput("");
  };

  const displayedUsers = search ? searchResults : chatUsers;
  const messages = selectedUser ? messagesMap[selectedUser.username] || [] : [];

  return (
    <div className="container">
      <ChatSidebar
        users={displayedUsers}
        selectedUser={selectedUser}
        isSearching={isSearching}
        search={search}
        setSearch={setSearch}
        onSelect={(user) => {
          if (search) {
            setModalUser(user);
          } else {
            setSelectedUser(user);
            const cleanUsername = user.username.startsWith("@") ? user.username : `@${user.username}`;
            navigate(`/chat/${cleanUsername}`);

            const chatMapStr = localStorage.getItem("chatMap");
            if (chatMapStr && !hasFetchedHistory.current[cleanUsername]) {
              const chatMap = JSON.parse(chatMapStr);
              const chatId = chatMap[cleanUsername];
              if (chatId) {
                fetchChatHistory(chatId, cleanUsername);
                hasFetchedHistory.current[cleanUsername] = true;
              }
            }
          }
        }}
        refreshChats={handleRefreshChats}
      />
      <main className="chatArea">
        <ChatMessages messages={messages} selectedUser={selectedUser} />
        <ChatInput input={input} setInput={setInput} onSend={sendMessage} disabled={!selectedUser} />
      </main>

      {modalUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Профиль пользователя</h2>
              <button className="modal-close" onClick={() => setModalUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="user-avatar modal-avatar">{modalUser.name[0]}</div>
              <div className="modal-username">{modalUser.username}</div>
            </div>
            <div className="modal-footer">
              <button className="modal-button" onClick={() => handleCreateChat(modalUser.username)}>
                Написать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}