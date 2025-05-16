
import React, { useState } from "react";
import SideMenu from "./SideMenu";

interface Props {
  users: (ChatUser | SearchResult)[];
  selectedUser: ChatUser | SearchResult | null;
  isSearching: boolean;
  search: string;
  setSearch: (value: string) => void;
  onSelect: (user: ChatUser | SearchResult) => void;
  refreshChats: () => Promise<void>;
}

interface ChatUser {
  id: string;
  username: string;
  name: string;
  chatName?: string;
}

interface SearchResult {
  username: string;
  name: string;
}

const ChatSidebar: React.FC<Props> = ({
  users,
  selectedUser,
  isSearching,
  search,
  setSearch,
  onSelect,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button className="menu-toggle" onClick={() => setIsMenuOpen(true)}>
          <span className="menu-icon"></span>
          <span className="menu-icon"></span>
          <span className="menu-icon"></span>
        </button>
        <div className="sidebar-search">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
          />
        </div>
      </div>
      <ul className="userList">
        {users.map((user) => (
          <li
            key={user.username}
            className={`user ${selectedUser?.username === user.username ? "active" : ""}`}
            onClick={() => onSelect(user)}
          >
            <div className="user-avatar">{user.name[0]}</div>
            <div className="user-info">
              <div className="user-name-wrapper">
                <span className="user-name">{user.name}</span>
                <span className="user-username">({user.username})</span>
              </div>
              <div className="user-lastmsg">
                {search ? (
                  <span className="user-lastmsg--search">Найденный пользователь</span>
                ) : (
                  "Нет сообщений"
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {isSearching && <div className="search-status">Поиск...</div>}
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
};

export default ChatSidebar;