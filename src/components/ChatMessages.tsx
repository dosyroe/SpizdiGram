import React, { useEffect, useRef } from "react";
import type { Message } from "../types";

interface Props {
  messages: Message[];
  selectedUser: { username: string; name: string } | null;
}

const ChatMessages: React.FC<Props> = ({ messages, selectedUser }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Прокрутка к последнему сообщению
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Форматирование времени (например, "14:30")
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="messages">
      {selectedUser ? (
        <>
          <h2>Чат с {selectedUser.name}</h2>
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div
                key={`${msg.id}-${index}`} 
                className={`message ${msg.own ? "own" : ""}`}
              >
                <div className="message-content">{msg.text}</div>
                {msg.timestamp && (
                  <div className="message-timestamp">{formatTimestamp(msg.timestamp)}</div>
                )}
                {msg.own && (
                  <div className={`message-status message-${msg.status}`}>
                    {msg.status === "loading" && "⌛"}
                    {msg.status === "sent" && "✔"}
                    {msg.status === "error" && "❌"}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="no-messages">Нет сообщений</div>
          )}
        </>
      ) : (
        <div className="no-messages">Выберите чат, чтобы начать общение</div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;