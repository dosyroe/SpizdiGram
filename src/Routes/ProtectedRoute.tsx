import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL;

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const name = localStorage.getItem("name");
    const jwt = localStorage.getItem("jwt");

    if (!name) {
      navigate("/login", { replace: true });
      return;
    }

    if (jwt) {
      setLoading(false);
      return;
    }

    axios
      .post(
        `${apiUrl}/users/refresh`,
        null,
        {
          params: { Name: name },
          withCredentials: true,
        }
      )
      .then(() => setLoading(false))
      .catch(() => {
        localStorage.removeItem("name");
        navigate("/login", { replace: true });
      });
  }, [navigate]);

  if (loading) return <div>Проверка авторизации...</div>;
  return <>{children}</>;
}