import axios from "axios";
import type {
    AxiosInstance,
    AxiosError,
    InternalAxiosRequestConfig,
} from "axios";

const apiUrl = import.meta.env.VITE_API_URL;

const api: AxiosInstance = axios.create({
    baseURL: apiUrl,
    withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: AxiosError) => void;
}> = [];
let refreshPromise: Promise<string> | null = null;
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 1;

const processQueue = (error: AxiosError | null, token: string | null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token as string);
        }
    });
    failedQueue = [];
};

const refreshToken = async (): Promise<string> => {
    const currentUsername = localStorage.getItem("name");
    const refreshToken = localStorage.getItem("refreshToken");

    if (!currentUsername || !refreshToken) {
        throw new Error("Не найдены имя пользователя или refreshToken");
    }

    if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        console.warn("Превышено максимальное количество попыток обновления токена");
        throw new Error(
            "Превышено максимальное количество попыток обновления токена"
        );
    }

    try {
        refreshAttempts++;
        console.log("Попытка обновления токена (попытка #", refreshAttempts, ")");
        const response = await axios.post(
            `${apiUrl}/auth/refresh`,
            {
                name: currentUsername,
                refreshToken: refreshToken,
            },
            { withCredentials: true }
        );

        const { jwt, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem("jwt", jwt);
        localStorage.setItem("refreshToken", newRefreshToken);
        console.log("Токен успешно обновлён:", jwt);
        refreshAttempts = 0;
        return jwt;
    } catch (error) {
        console.error("Ошибка при обновлении токена:", error);
        localStorage.removeItem("jwt");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("name");
        localStorage.removeItem("chatMap");
        window.location.href = "/login";
        throw error;
    } finally {
        refreshPromise = null;
    }
};

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem("jwt");
        console.log(
            `Отправка запроса [${config.url}] с токеном:`,
            token ? "да" : "нет"
        );
        config.headers = config.headers || {};
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Перехватчик ответов (обрабатываем 401)
api.interceptors.response.use(
    (response) => {
        console.log(
            `Получен успешный ответ [${response.config.url}] со статусом:`,
            response.status
        );
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        if (error.response?.status === 401 && !originalRequest._retry) {
            console.log(
                `Обнаружена ошибка 401 для запроса: [${originalRequest.url}]`
            );
            originalRequest._retry = true;

            if (isRefreshing) {
                console.log(
                    `Токен уже обновляется, добавляем запрос [${originalRequest.url}] в очередь`
                );
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            isRefreshing = true;
            if (!refreshPromise) {
                refreshPromise = refreshToken();
            }
            try {
                const newToken = await refreshPromise;
                console.log(
                    `Токен обновлён, повторяем запрос [${originalRequest.url}] с новым токеном`
                );
                processQueue(null, newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                console.error(
                    "Ошибка при обновлении токена, перенаправление на /login:",
                    refreshError
                );
                processQueue(refreshError as AxiosError, null);
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        console.error(
            `Ошибка без обработки 401 для [${originalRequest?.url}]:`,
            error
        );
        return Promise.reject(error);
    }
);

export default api;
