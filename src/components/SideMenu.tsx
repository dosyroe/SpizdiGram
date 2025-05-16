
import React, { useState } from "react";
import api from "../types/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SideMenu: React.FC<Props> = ({ isOpen, onClose }) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = localStorage.getItem("login") || "Не указан";
  const avatarInitial = localStorage.getItem("name")?.[0] || "U";

  const handleLogout = async () => {
    try {
      await api.delete("/users/logout");
      localStorage.clear();
      window.location.href = "/login";
    } catch (error) {
      console.error("Ошибка при выходе:", error);
    }
  };

  const handleDeleteAccount = async () => {
    const name = localStorage.getItem("name");
    const login = localStorage.getItem("login");
    const jwt = localStorage.getItem("jwt");

    if (!name || !login || !jwt || !password) {
      setError("Не все данные доступны или пароль не введён");
      return;
    }

    try {
      await api.delete("/users/deleteAccount", {
        data: { login, password, name, jwt },
      });
      localStorage.clear();
      window.location.href = "/login";
    } catch (error) {
      console.error("Ошибка при удалении аккаунта:", error);
      setError("Неверный пароль или другая ошибка");
    }
  };

  return (
    <div className={`side-menu ${isOpen ? "open" : ""}`}>
      <button className="back-button" onClick={onClose}>
        ←
      </button>
      <div className="menu-content">
        <div className="user-profile">
          <div className="user-avatar">{avatarInitial}</div>
          <div className="user-details">
            <h2>Профиль</h2>
            <p className="user-login">{login}</p>
          </div>
        </div>
        <button className="menu-button" onClick={handleLogout}>
          Выйти
        </button>
        <button className="menu-button" onClick={() => setIsDeleteModalOpen(true)}>
          Удалить аккаунт
        </button>
      </div>

      {isDeleteModalOpen && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <h3>Подтверждение удаления аккаунта</h3>
            <p>Введите пароль для подтверждения:</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
            />
            {error && <p className="error">{error}</p>}
            <div className="delete-modal-actions">
              <button onClick={() => setIsDeleteModalOpen(false)}>Отмена</button>
              <button onClick={handleDeleteAccount}>Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SideMenu;