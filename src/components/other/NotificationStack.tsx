import React from 'react';

type NotificationStackProps = {
  children: React.ReactNode;
};

export default function NotificationStack({ children }: NotificationStackProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>
  );
}