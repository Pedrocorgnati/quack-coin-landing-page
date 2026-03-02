// components/messenger/ConnectionStatus.tsx
// Shows real-time SSE connection state with auto-reconnect support.

"use client";

interface ConnectionStatusProps {
  status: "connected" | "connecting" | "disconnected";
  onReconnect?: () => void;
}

export function ConnectionStatus({ status, onReconnect }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {status === "connected" && (
        <>
          <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
          Connected
        </>
      )}
      {status === "connecting" && (
        <>
          <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" aria-hidden />
          Connecting…
        </>
      )}
      {status === "disconnected" && (
        <>
          <span className="h-2 w-2 rounded-full bg-destructive" aria-hidden />
          Disconnected
          {onReconnect && (
            <button
              onClick={onReconnect}
              className="ml-1 underline hover:no-underline focus:outline-none"
            >
              Reconnect
            </button>
          )}
        </>
      )}
    </div>
  );
}
