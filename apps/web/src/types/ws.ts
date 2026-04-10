import type { RoomSnapshot } from "./room";
import type { RuntimeGameState } from "./game";

export type WsEnvelope<TType extends string, TPayload> = {
  type: TType;
  payload: TPayload;
  sentAt: string;
};

export type ClientEvents =
  | { type: "room:create"; payload: Record<string, unknown> }
  | { type: "room:join"; payload: Record<string, unknown> }
  | { type: "room:start"; payload: { roomId: string } }
  | {
      type: "player:update-avatar";
      payload: { roomId: string; avatarId: string };
    }
  | { type: "game:submit-guess"; payload: SubmitGuessPayload }
  | { type: "client:reconnect"; payload: { roomId: string; playerId: string } }
  | { type: "host:force-advance"; payload: { roomId: string } };

export type ServerEvents =
  | { type: "room:created"; payload: RoomSnapshot }
  | { type: "room:joined"; payload: RoomSnapshot }
  | { type: "room:player-joined"; payload: Record<string, unknown> }
  | { type: "room:player-left"; payload: Record<string, unknown> }
  | { type: "room:countdown"; payload: { secondsRemaining: number } }
  | { type: "game:started"; payload: Record<string, unknown> }
  | { type: "game:step"; payload: StepSnapshot }
  | { type: "game:guess-submitted"; payload: Record<string, unknown> }
  | { type: "game:step-complete"; payload: Record<string, unknown> }
  | { type: "game:result"; payload: Record<string, unknown> }
  | { type: "state:full"; payload: FullReconnectState }
  | { type: "error"; payload: ErrorPayload };

export type SubmitGuessPayload = {
  roomId?: string;
  gameId: string;
  playerId: string;
  stepNumber: number;
  guessText: string;
  submittedAt: string;
};

export type StepSnapshot = {
  gameId: string;
  currentStep: number;
  totalSteps: number;
  imageUrl: string;
  activeTurnPlayerId?: string;
  deadlineAt?: string;
};

export type FullReconnectState = {
  room: RoomSnapshot;
  game?: RuntimeGameState;
};

export type ErrorPayload = {
  code: string;
  message: string;
};
