import React, { useEffect, useState } from 'react';
import styles from '../../styles/Notification.module.css';

type NotificationProps = {
  message: string;
  type?: 'error' | 'success';
  onClose: () => void;
};

export default function Notification({ message, type = 'error', onClose }: NotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 400); 
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`${styles.notification} ${styles[type]} ${visible ? styles.visible : ''}`}>
      <span>{message}</span>
    </div>
  );
}