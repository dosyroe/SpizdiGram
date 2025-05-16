import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "axios";
import { useState } from 'react';
import Notification from '../components/other/Notification';
import NotificationStack from '../components/other/NotificationStack';
import { useNavigate } from "react-router-dom";

import styles from "../styles/Authentication.module.css";

const schema = yup.object({
    login: yup.string().email("Некорректный email").required("Введите email"),
    password: yup.string().required("Введите пароль"),
});

type LoginFormInputs = {
    login: string;
    password: string;
};

export default function Login() {
    const navigate = useNavigate();
    const [serverErrors, setServerErrors] = useState<string[]>([]);
    const [showValidationErrors, setShowValidationErrors] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormInputs>({
        resolver: yupResolver(schema),
    });

    const validationErrors = [];
    if (showValidationErrors && errors.login?.message) validationErrors.push(errors.login.message);
    if (showValidationErrors && errors.password?.message) validationErrors.push(errors.password.message);

    const allErrors = [...validationErrors, ...serverErrors];

    const onSubmit = async (data: LoginFormInputs) => {
        setShowValidationErrors(true);
        if (Object.keys(errors).length > 0) {
            return;
        }

        try {
            const response = await axios.post(`/users/login`, data, {
                withCredentials: true,
            });
            const name = response.data.name;
            const jwt = response.data.jwt;
            if (name) {
                localStorage.setItem("name", name);
                localStorage.setItem("jwt", jwt);
                alert("Успешный вход!");
                navigate("/", { replace: true });
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setServerErrors((prev) => [
                    ...prev,
                    error.response?.data?.message || "Ошибка входа",
                ]);
            } else {
                setServerErrors((prev) => [
                    ...prev,
                    "Произошла неизвестная ошибка",
                ]);
            }
        }
    };

    const handleClose = (idx: number) => {
        if (idx >= validationErrors.length) {
            const serverIdx = idx - validationErrors.length;
            setServerErrors((prev) => prev.filter((_, i) => i !== serverIdx));
        }
    };

    return (
        <>
            <NotificationStack>
                {allErrors.map((msg, idx) => (
                    <Notification
                        key={msg + idx}
                        message={msg}
                        type="error"
                        onClose={() => handleClose(idx)}
                    />
                ))}
            </NotificationStack>
            <form
                className={styles.form}
                onSubmit={handleSubmit(onSubmit, () => setShowValidationErrors(true))}
                autoComplete="off"
                noValidate
            >
                <div className={`${styles.authorization} ${styles.fadeIn}`}>
                    <h2 className={`${styles.h2} ${styles.fadeIn}`}>Вход</h2>
                    <input className={`${styles.input} ${styles.fadeIn}`}
                        type="email"
                        placeholder="Email"
                        {...register("login")}
                    />
                    <input className={`${styles.input} ${styles.fadeIn}`}
                        type="password"
                        placeholder="Пароль"
                        {...register("password")}
                    />
                    <button className={styles.button} type="submit" disabled={isSubmitting}>
                        Войти
                    </button>
                    <div className={styles.additionallinks}>
                        <p>
                            Нет аккаунта? <a href="/register">Зарегистрироваться</a>
                        </p>
                    </div>
                </div>
            </form>
        </>
    );
}
