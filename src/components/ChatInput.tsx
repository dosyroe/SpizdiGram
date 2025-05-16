
interface Props {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
}

export default function ChatInput({ input, setInput, onSend, disabled }: Props) {
  return (
    <div className="inputArea">
      <input
        className="input"
        value={input}
        placeholder={disabled ? "Нет доступных чатов" : "Сообщение"}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && onSend()}
        disabled={disabled}
      />
      <button className="button" onClick={onSend} disabled={disabled}>
        Отправить
      </button>
    </div>
  );
}