import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "axios";
import { useState } from "react";
import Notification from "../components/other/Notification";
import NotificationStack from "../components/other/NotificationStack";
import { useNavigate } from "react-router-dom";

import styles from "../styles/Authentication.module.css";

const schema = yup.object({
    name: yup.string().required("Введите имя пользователя"),
    login: yup.string().email("Некорректный email").required("Введите email"),
    password: yup.string().min(6, "Минимум 6 символов").required("Введите пароль"),
    confirmPassword: yup
        .string()
        .oneOf([yup.ref("password")], "Пароли не совпадают")
        .required("Подтвердите пароль"),
});

type RegisterFormInputs = {
    name: string;
    login: string;
    password: string;
    confirmPassword: string;
};

export default function Register() {
    const navigate = useNavigate();
    const [serverErrors, setServerErrors] = useState<string[]>([]);
    const [showValidationErrors, setShowValidationErrors] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormInputs>({
        resolver: yupResolver(schema),
    });

    const validationErrors: string[] = [];
    if (showValidationErrors && errors.name?.message) validationErrors.push(errors.name.message);
    if (showValidationErrors && errors.login?.message) validationErrors.push(errors.login.message);
    if (showValidationErrors && errors.password?.message) validationErrors.push(errors.password.message);
    if (showValidationErrors && errors.confirmPassword?.message) validationErrors.push(errors.confirmPassword.message);

    const allErrors = [...validationErrors, ...serverErrors];

    const onSubmit = async (data: RegisterFormInputs) => {
        try {
            const response = await axios.post(
                `/users/register`,
                {
                    name: data.name,
                    login: data.login,
                    password: data.password,
                },
                { withCredentials: true }
            );
            const name = response.data.name;
            const jwt = response.data.jwt;
            if (name) {
                localStorage.setItem("name", name);
                localStorage.setItem("jwt", jwt);
                navigate("/", { replace: true });
            }
            alert("Регистрация успешна!");
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setServerErrors([error.response?.data?.message || "Ошибка регистрации"]);
            } else {
                setServerErrors(["Ошибка регистрации"]);
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
                    <h2 className={`${styles.h2} ${styles.fadeIn}`}>Регистрация</h2>
                    <input
                        className={`${styles.input} ${styles.fadeIn}`}
                        type="text"
                        placeholder="Name"
                        {...register("name")}
                    />
                    <input
                        className={`${styles.input} ${styles.fadeIn}`}
                        type="email"
                        placeholder="E-mail"
                        {...register("login")}
                    />
                    <input
                        className={`${styles.input} ${styles.fadeIn}`}
                        type="password"
                        placeholder="Пароль"
                        {...register("password")}
                    />
                    <input
                        className={`${styles.input} ${styles.fadeIn}`}
                        type="password"
                        placeholder="Подтвердите пароль"
                        {...register("confirmPassword")}
                    />
                    <button className={styles.button} type="submit" disabled={isSubmitting}>
                        Зарегистрироваться
                    </button>
                    <div className={styles.additionallinks}>
                        <p>
                            Уже есть аккаунт? <a href="/login">Войти</a>
                        </p>
                    </div>
                </div>
            </form>
        </>
    );
}
