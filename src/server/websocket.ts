/**
 * Native WebSocket server attachment — typically run beside or behind Next.
 * Handlers stay small; compose from room-handlers and game-engine in later phases.
 */

export type WsServerHooks = {
  onConnection?: (id: string) => void;
  onClose?: (id: string) => void;
};

export function createWebSocketPlaceholder(): { description: string } {
  return {
    description:
      "Replace with Bun/Node WS server or edge-compatible gateway when implementing multiplayer.",
  };
}
