export type ConnectionStatus = "connected" | "attention" | "disconnected";

export function ConnectionLamp({ status }: { status: ConnectionStatus }) {
  const copy = getConnectionCopy(status);

  return (
    <div className="connection-lamp" title={copy.title}>
      <span className="connection-lamp-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M4 15a10 10 0 0 1 16 0" />
          <path d="M7 18a6 6 0 0 1 10 0" />
          <circle cx="12" cy="20" r="1.2" />
        </svg>
      </span>
      <span className={`connection-lamp-dot ${status}`} />
      <span className="connection-lamp-sr">{copy.title}</span>
    </div>
  );
}

function getConnectionCopy(status: ConnectionStatus) {
  if (status === "connected") {
    return {
      title: "Conexão ativa"
    };
  }

  if (status === "attention") {
    return {
      title: "Conexão precisa de atenção"
    };
  }

  return {
    title: "Conexão desconectada"
  };
}
