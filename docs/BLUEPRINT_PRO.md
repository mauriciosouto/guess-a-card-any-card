# GUESS A CARD, ANY CARD — BLUEPRINT PRO

## 0. Documento
Versión: PRO v1  
Estado: aprobado para implementación  
Rol de referencia: Senior Project Lead  
Objetivo: convertir la visión del producto en una guía ejecutable para Cursor y para desarrollo iterativo real.

---

# 1. PRODUCT VISION

## 1.1 Elevator pitch
**Guess a Card, Any Card** es un party game online inspirado en Flesh and Blood donde una carta comienza altamente ofuscada y se va revelando paso a paso.  
El jugador —o un grupo de jugadores— debe adivinarla antes de quedarse sin intentos.

El juego debe sentirse:
- divertido
- rápido de entender
- satisfactorio al acertar
- visualmente atractivo para compartir, streamear y jugar entre amigos
- usable tanto en desktop como en mobile

## 1.2 Objetivo de negocio / producto
Construir primero una experiencia sólida de **single player**, y luego expandir a:
- competitive multiplayer
- cooperative multiplayer
- challenge a friend

## 1.3 Público objetivo
Primario:
- jugadores de Flesh and Blood
- comunidades locales
- amigos que ya conocen parcialmente el juego

Secundario:
- streamers
- creadores de contenido
- grupos que quieren un ice breaker relacionado a FaB

## 1.4 Requisitos de acceso
- jugar como invitado debe ser posible
- registrarse debe ser opcional
- usuarios registrados pueden guardar estadísticas y perfil
- login inicial: OAuth Google o Discord

---

# 2. PRODUCT PRINCIPLES

## 2.1 Principios
1. **La carta es el centro de la experiencia.**
2. **Cada step debe aumentar tensión y claridad.**
3. **La UX debe sentirse rápida y limpia.**
4. **Single player debe funcionar perfecto antes de escalar multiplayer.**
5. **El Game App nunca genera puzzles; solo los consume.**
6. **El sistema debe ser extensible a datasets futuros, pero sin contaminar el MVP actual.**

## 2.2 No objetivos iniciales
- no crear chat interno
- no crear editor de puzzles en el game app
- no permitir custom datasets en esta fase
- no construir ranking global complejo en el MVP
- no complicar el flujo con demasiadas opciones al inicio

---

# 3. MODES OF PLAY

## 3.1 Single Player
### Descripción
Un jugador ve una carta ofuscada y tiene **1 guess por step**.  
Si falla, se revela el step siguiente.  
Si acierta, gana.  
Si llega al step final sin acertar, pierde.

### Objetivos del modo
- ser el primer modo en producción
- validar UX del puzzle viewer
- validar autocomplete
- validar tracking de intentos y tiempo
- validar estadísticas personales

### Reglas
- 1 guess por step
- sin timer obligatorio visible
- fin inmediato al acertar
- derrota al agotar todos los steps

### Persistencia
Invitado:
- storage local básico opcional

Registrado:
- stats persistidas en DB

---

## 3.2 Competitive Multiplayer
### Descripción
Todos los jugadores ven la **misma carta** y el **mismo step** al mismo tiempo.

Cada jugador:
- tiene su propio input
- hace su guess a su ritmo durante el step actual
- no ve el siguiente step hasta que todos hayan enviado su guess o expire el timer

### Condición de victoria
1. gana quien acierta en **menos intentos**
2. si empatan en intentos, gana quien usó **menos tiempo total**

### Reglas
- 1 guess por step
- timer por step configurable por el host
- el step avanza cuando:
  - todos enviaron guess, o
  - expira el timer
- quien acierta puede quedar “locked as solved”, pero sigue esperando el cierre del step grupal
- al finalizar, se muestra historial comparativo de guesses y tiempos

### Nota de diseño
El multiplayer competitivo no es una carrera de “primero en apretar enter”; es una carrera de:
- menos intentos
- mejor tiempo total

---

## 3.3 Cooperative Multiplayer
### Descripción
Todos ven la misma carta y pueden conversar externamente.  
Solo **una persona por step** tiene el derecho de enviar el guess del equipo.

### Reglas
- orden aleatorio pero fijo definido al iniciar partida
- cada step corresponde a un jugador activo
- si falla, se revela siguiente step y el turno pasa al siguiente jugador
- si alguien se desconecta, el host puede ingresar el guess del equipo
- sin chat interno

### Condición de victoria
El equipo gana si acierta antes de agotar steps.

### Condición de derrota
El equipo pierde si consume todos los steps sin acertar.

---

## 3.4 Challenge a Friend
### Descripción
Modo social / asimétrico.
El host elige una carta específica y desafía a otra persona a adivinarla.

### Casos de uso
- mismo dispositivo
- compartir link
- contenido para amigos / streams / bromas entre jugadores

### Reglas base
- host puede filtrar por set y seleccionar carta específica
- el challenge usa el puzzle ya generado de esa carta
- el desafiante juega con mismas reglas de single player

### Estado recomendado
No MVP inicial. Diseñar la arquitectura ahora, implementar después de single player estable.

---

# 4. PUZZLE SYSTEM CONTRACT

## 4.1 Fuente de verdad
La aplicación de admin genera y guarda puzzles en la misma Supabase usada por el game app.

## 4.2 El game app nunca:
- genera steps
- edita steps
- recalcula transformaciones
- exporta/importa manualmente

## 4.3 El game app sí:
- consulta puzzles disponibles
- filtra por set
- selecciona puzzle aleatorio
- renderiza `step_n_url`
- muestra metadatos de partida
- registra guesses y resultados

## 4.4 Estructura conceptual de puzzle
```ts
type Puzzle = {
  id: string
  cardCode: string
  cardName: string
  setName: string
  totalSteps: number
  steps: PuzzleStep[]
  isActive: boolean
  createdAt: string
}

type PuzzleStep = {
  stepNumber: number
  imageUrl: string
  label?: string
}
```

## 4.5 Reglas de selección
- host elige uno o más sets
- el sistema elige aleatoriamente un puzzle dentro de esos sets
- se intenta evitar repetir carta al mismo host
- si no hay suficientes puzzles no repetidos, se permite fallback a puzzles previos con criterio controlado

## 4.6 Política de no repetición
### Opción recomendada
Guardar historial de puzzles usados por host:
- por usuario registrado: `host_user_id`
- por invitado: `guest_fingerprint/session_id`

Regla:
- primero buscar puzzles no usados recientemente
- si no alcanza, relajar criterio

---

# 5. USER JOURNEYS

## 5.1 Single Player Journey
1. usuario entra al home
2. elige single player
3. selecciona sets permitidos
4. inicia partida
5. ve countdown corto opcional
6. step 1 aparece
7. escribe guess con autocomplete
8. envía guess
9. si falla, step 2
10. repite hasta acertar o perder
11. ve pantalla final con:
   - resultado
   - carta completa
   - historial de guesses
   - tiempo total
   - intentos
   - CTA para jugar de nuevo

## 5.2 Competitive Journey
1. host crea room
2. selecciona sets
3. define timer por step
4. comparte link
5. jugadores se unen
6. eligen avatar o se asigna aleatorio
7. host inicia
8. countdown
9. step actual para todos
10. cada uno envía guess
11. cuando todos enviaron o expira timer → siguiente step
12. al finalizar se muestra ranking de la partida

## 5.3 Cooperative Journey
1. host crea room
2. selecciona sets
3. jugadores se unen
4. avatares
5. host inicia
6. se define orden aleatorio
7. countdown
8. cada step muestra claramente quién tiene el turno
9. jugador activo envía guess
10. si falla, pasa al siguiente jugador
11. pantalla final con historial del equipo

## 5.4 Challenge Journey
1. host crea challenge
2. filtra por set
3. elige carta
4. genera link o juega en mismo dispositivo
5. friend intenta adivinar
6. se muestra resultado final

---

# 6. UX BLUEPRINT

## 6.1 Objetivos UX
- entender inmediatamente qué hacer
- minimizar fricción de input
- hacer que cada reveal sea emocionante
- mantener la carta como foco
- no saturar mobile
- ser visualmente atractivo para stream

## 6.2 Información siempre visible durante partida
### Obligatoria
- imagen actual del puzzle
- step actual / total
- intentos usados
- intentos restantes
- input de guess
- botón de enviar
- estado del resultado del último intento

### Según modo
Single:
- progreso personal

Competitive:
- lista de jugadores
- quién ya envió guess y quién no
- tiempo restante del step

Coop:
- jugador activo del turno
- orden de turnos
- host controls mínimos

## 6.3 Resultado final
Debe incluir:
- carta completa
- nombre correcto
- set
- historial de guesses
- tiempos
- CTA replay
- CTA volver al home
- en multi: resumen por jugador / equipo

---

# 7. VISUAL DIRECTION

## 7.1 Estilo
- inspirado en Flesh and Blood
- dark fantasy
- streamer-friendly
- limpio y legible
- alto contraste

## 7.2 Nombre del producto
**Guess a Card, Any Card**

## 7.3 Logo direction
Inspiración conceptual:
- referencia indirecta a “Pick a Card, Any Card”
- sensación de truco / conocimiento / adivinación
- posible combinación de:
  - carta
  - ojo / visión
  - destello mágico
  - marco ornamental oscuro

## 7.4 Avatares
Preferencia:
- héroes o artes de cartas FaB
- si no hay selección manual, asignación aleatoria

---

# 8. ANIMATION & SOUND

## 8.1 Animaciones requeridas
- transición entre steps: **slide**
- feedback de win
- feedback de lose
- reveal final de la carta

## 8.2 Criterio
- suaves
- rápidas
- no pesadas
- compatibles con mobile

## 8.3 Sonidos
- submit guess
- correct guess
- wrong guess
- next step / reveal

## 8.4 Restricción
- volumen tranquilo
- no hace falta control de volumen en MVP

---

# 9. TECH ARCHITECTURE

## 9.1 Stack
- Frontend: Next.js
- Backend: Hono
- Real-time: WebSockets nativos
- Database: Supabase PostgreSQL
- ORM: Prisma
- Auth: Supabase Auth con OAuth Google / Discord
- Storage puzzle assets: Supabase Storage o URLs persistidas

## 9.2 Repositorio
Solo `/game`  
El admin ya existe como sistema separado.

## 9.3 Arquitectura lógica
### Capas
1. Presentation Layer
2. Game State Layer
3. Real-time Transport Layer
4. Persistence Layer
5. Puzzle Access Layer
6. Auth/Profile Layer

## 9.4 Principio técnico
Separar claramente:
- lógica de UI
- lógica de estado de partida
- lógica de transporte WS
- persistencia
- servicios de puzzle

---

# 10. REPO STRUCTURE RECOMMENDED

```txt
/game
  /src
    /app
      /(public)
        /page.tsx
        /single/page.tsx
        /competitive/page.tsx
        /coop/page.tsx
        /challenge/page.tsx
        /room/[id]/page.tsx
        /profile/page.tsx
        /stats/page.tsx
    /components
      /game
        PuzzleViewer.tsx
        GuessInput.tsx
        StepIndicator.tsx
        AttemptsIndicator.tsx
        ResultBanner.tsx
        PlayerStatusList.tsx
        TurnIndicator.tsx
        TimerBar.tsx
      /room
        RoomLobby.tsx
        PlayerCard.tsx
        AvatarSelector.tsx
        SetSelector.tsx
      /layout
      /ui
    /features
      /auth
      /profile
      /rooms
      /game-session
      /puzzles
      /stats
    /lib
      /supabase
      /ws
      /audio
      /utils
      /config
    /server
      http-app.ts
      websocket.ts
      room-handlers.ts
      game-engine.ts
      reconnect.ts
      timers.ts
    /types
      game.ts
      room.ts
      ws.ts
      db.ts
    /hooks
    /stores
      useRoomStore.ts
      useGameStore.ts
      useProfileStore.ts
    /prisma
      schema.prisma
      /migrations
      /seed
```

---

# 11. DOMAIN MODEL

## 11.1 Core entities
- User
- GuestSession
- Room
- RoomPlayer
- GameSession
- Puzzle
- PuzzleStep
- Guess
- UserStats
- Achievement
- HostPuzzleHistory

## 11.2 Conceptual responsibilities
### User
Autenticación y perfil persistente.

### GuestSession
Identidad liviana no persistente o semi-persistente para invitados.

### Room
Contenedor de pre-game y de multiplayer live session.

### GameSession
Instancia concreta de una partida sobre un puzzle específico.

### Guess
Registro de intento por jugador y step.

### HostPuzzleHistory
Permite evitar repeticiones al host.

---

# 12. DATABASE DESIGN (PRO)

## 12.1 Tabla `users`
```sql
id uuid pk
display_name text not null
email text unique null
provider text null
avatar_url text null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

## 12.2 Tabla `profiles`
```sql
user_id uuid pk references users(id)
preferred_avatar_id text null
bio text null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

## 12.3 Tabla `puzzles`
```sql
id uuid pk
card_code text not null unique
card_name text not null
set_name text not null
is_active boolean not null default true
total_steps int not null
metadata jsonb null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

## 12.4 Tabla `puzzle_steps`
```sql
id uuid pk
puzzle_id uuid not null references puzzles(id) on delete cascade
step_number int not null
image_url text not null
created_at timestamptz not null default now()

unique(puzzle_id, step_number)
```

## 12.5 Tabla `rooms`
```sql
id uuid pk
host_user_id uuid null references users(id)
host_guest_id text null
mode text not null
state text not null
selected_sets text[] not null
timer_per_step_seconds int null
current_game_id uuid null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

## 12.6 Tabla `room_players`
```sql
id uuid pk
room_id uuid not null references rooms(id) on delete cascade
user_id uuid null references users(id)
guest_id text null
display_name text not null
avatar_id text null
is_host boolean not null default false
turn_order int null
joined_at timestamptz not null default now()
left_at timestamptz null
is_connected boolean not null default true
```

## 12.7 Tabla `games`
```sql
id uuid pk
room_id uuid null references rooms(id) on delete set null
mode text not null
puzzle_id uuid not null references puzzles(id)
status text not null
started_at timestamptz not null default now()
finished_at timestamptz null
winner_user_id uuid null references users(id)
winner_guest_id text null
winning_attempt_count int null
winning_total_time_ms int null
created_at timestamptz not null default now()
```

## 12.8 Tabla `game_players`
```sql
id uuid pk
game_id uuid not null references games(id) on delete cascade
room_player_id uuid null references room_players(id) on delete set null
user_id uuid null references users(id)
guest_id text null
display_name text not null
avatar_id text null
final_rank int null
solved_at_step int null
solved_total_time_ms int null
did_win boolean not null default false
created_at timestamptz not null default now()
```

## 12.9 Tabla `guesses`
```sql
id uuid pk
game_id uuid not null references games(id) on delete cascade
game_player_id uuid not null references game_players(id) on delete cascade
step_number int not null
guess_text text not null
normalized_guess_text text not null
is_correct boolean not null
time_taken_ms int not null
created_at timestamptz not null default now()
```

## 12.10 Tabla `user_stats`
```sql
user_id uuid pk references users(id) on delete cascade
games_played int not null default 0
games_won int not null default 0
games_lost int not null default 0
average_attempts_to_win numeric(6,2) null
best_attempts_record int null
best_time_record_ms int null
updated_at timestamptz not null default now()
```

## 12.11 Tabla `user_card_stats`
```sql
id uuid pk
user_id uuid not null references users(id) on delete cascade
puzzle_id uuid not null references puzzles(id) on delete cascade
times_played int not null default 0
times_won int not null default 0
average_attempts numeric(6,2) null
average_time_ms numeric(12,2) null

unique(user_id, puzzle_id)
```

## 12.12 Tabla `host_puzzle_history`
```sql
id uuid pk
host_user_id uuid null references users(id)
host_guest_id text null
puzzle_id uuid not null references puzzles(id) on delete cascade
last_played_at timestamptz not null default now()
```

## 12.13 Tabla `achievements`
```sql
id uuid pk
code text unique not null
name text not null
description text not null
created_at timestamptz not null default now()
```

## 12.14 Tabla `user_achievements`
```sql
id uuid pk
user_id uuid not null references users(id) on delete cascade
achievement_id uuid not null references achievements(id) on delete cascade
unlocked_at timestamptz not null default now()

unique(user_id, achievement_id)
```

---

# 13. PRISMA SCHEMA NOTES

## 13.1 Enums recomendados
```prisma
enum GameMode {
  SINGLE
  COMPETITIVE
  COOP
  CHALLENGE
}

enum RoomState {
  LOBBY
  COUNTDOWN
  IN_PROGRESS
  FINISHED
  ABANDONED
}

enum GameStatus {
  PENDING
  IN_PROGRESS
  WON
  LOST
  DRAW
  CANCELLED
}
```

## 13.2 Índices importantes
- `puzzles(set_name, is_active)`
- `puzzle_steps(puzzle_id, step_number unique)`
- `guesses(game_id, game_player_id, step_number)`
- `room_players(room_id, joined_at)`
- `host_puzzle_history(host_user_id, last_played_at)`

---

# 14. STATE MODEL

## 14.1 Room State
```ts
type RoomState =
  | "LOBBY"
  | "COUNTDOWN"
  | "IN_PROGRESS"
  | "FINISHED"
  | "ABANDONED"
```

## 14.2 Game Session State
```ts
type GameMode = "SINGLE" | "COMPETITIVE" | "COOP" | "CHALLENGE"

type PlayerRuntimeState = {
  playerId: string
  displayName: string
  avatarId?: string
  isConnected: boolean
  hasSubmittedCurrentStep: boolean
  isSolved: boolean
  solvedAtStep?: number
  totalTimeMs: number
  attemptsUsed: number
}

type RuntimeGameState = {
  gameId: string
  roomId?: string
  mode: GameMode
  puzzleId: string
  cardName: string
  setName: string
  currentStep: number
  totalSteps: number
  status: "IN_PROGRESS" | "WON" | "LOST" | "FINISHED"
  players: PlayerRuntimeState[]
  activeTurnPlayerId?: string
  stepDeadlineAt?: string
  startedAt: string
  finishedAt?: string
}
```

## 14.3 Cliente: store mínimo
- currentRoom
- currentGame
- selfPlayer
- currentStepImageUrl
- suggestions
- guessHistory
- timerRemaining
- ui flags
- reconnect status

---

# 15. WEBSOCKET EVENT CONTRACT

## 15.1 Principios
- mensajes pequeños y explícitos
- nombres de evento consistentes
- separar command events de state events
- on reconnect, mandar snapshot completo

## 15.2 Estructura base
```ts
type WsEnvelope<TType extends string, TPayload> = {
  type: TType
  payload: TPayload
  sentAt: string
}
```

## 15.3 Client → Server events
```ts
type ClientEvents =
  | { type: "room:create"; payload: CreateRoomPayload }
  | { type: "room:join"; payload: JoinRoomPayload }
  | { type: "room:start"; payload: { roomId: string } }
  | { type: "player:update-avatar"; payload: { roomId: string; avatarId: string } }
  | { type: "game:submit-guess"; payload: SubmitGuessPayload }
  | { type: "client:reconnect"; payload: { roomId: string; playerId: string } }
  | { type: "host:force-advance"; payload: { roomId: string } }
```

## 15.4 Server → Client events
```ts
type ServerEvents =
  | { type: "room:created"; payload: RoomSnapshot }
  | { type: "room:joined"; payload: RoomSnapshot }
  | { type: "room:player-joined"; payload: RoomPlayerJoinedPayload }
  | { type: "room:player-left"; payload: RoomPlayerLeftPayload }
  | { type: "room:countdown"; payload: { secondsRemaining: number } }
  | { type: "game:started"; payload: GameSnapshot }
  | { type: "game:step"; payload: StepSnapshot }
  | { type: "game:guess-submitted"; payload: GuessSubmittedPayload }
  | { type: "game:step-complete"; payload: StepCompletePayload }
  | { type: "game:result"; payload: GameResultPayload }
  | { type: "state:full"; payload: FullReconnectState }
  | { type: "error"; payload: ErrorPayload }
```

## 15.5 Payloads clave
```ts
type SubmitGuessPayload = {
  roomId?: string
  gameId: string
  playerId: string
  stepNumber: number
  guessText: string
  submittedAt: string
}

type StepSnapshot = {
  gameId: string
  currentStep: number
  totalSteps: number
  imageUrl: string
  activeTurnPlayerId?: string
  deadlineAt?: string
}
```

---

# 16. RECONNECTION STRATEGY

## 16.1 Requisito
Si un jugador pierde conexión, debe poder volver y recuperar **todo el estado**.

## 16.2 El servidor debe devolver
- room
- players
- game actual
- step actual
- historial de guesses
- quién ya envió en el step actual
- deadline del timer
- estado de victoria/derrota si la partida terminó

## 16.3 Estrategia cliente
1. detectar disconnect
2. intentar reconnect automático
3. reenviar identidad del jugador
4. recibir `state:full`
5. rehidratar stores
6. continuar sin recargar la página si es posible

## 16.4 Casos edge
- si la room ya terminó → mostrar pantalla final
- si el jugador ya había acertado → volver con estado solved
- si se perdió countdown → entrar directo al step actual

---

# 17. GAME ENGINES

## 17.1 Engine separation
Recomendado:
- `singlePlayerEngine`
- `competitiveEngine`
- `coopEngine`
- `challengeEngine`

Todos comparten:
- puzzle access
- guess normalization
- result calculation
- persistence layer

## 17.2 Single Player engine responsibilities
- iniciar partida con puzzle aleatorio
- validar guess
- avanzar step
- determinar win/lose
- persistir partida
- actualizar stats si user registrado

## 17.3 Competitive engine responsibilities
- sincronizar step grupal
- registrar guess individual
- detectar “all submitted”
- controlar timer por step
- resolver ranking final

## 17.4 Coop engine responsibilities
- definir turn order aleatorio
- determinar active player
- avanzar turno
- permitir host override si aplica
- persistir historial de equipo

---

# 18. GUESS NORMALIZATION

## 18.1 Necesidad
El jugador escribe texto libre; el sistema debe comparar contra nombre de carta con tolerancia razonable.

## 18.2 Reglas base
- trim espacios
- lowercase
- remover dobles espacios
- normalizar símbolos especiales si aplica

## 18.3 MVP
Comparación exacta tras normalización.

## 18.4 Futuro
Se puede añadir:
- alias
- fuzzy matching pequeño
- tolerancia a apostrofes o guiones

---

# 19. AUTOCOMPLETE / SUGGESTIONS

## 19.1 Requisito
No es solo autocomplete duro; debe mostrar una lista de cartas que matchean lo que el usuario escribe.

## 19.2 Fuente
Cards dataset canónico de Flesh and Blood.

## 19.3 Comportamiento
- input debounced
- sugerencias mientras escribe
- keyboard navigation
- click/tap para seleccionar sugerencia
- submit claro y rápido

## 19.4 UX rule
No autocompletar agresivamente al punto de estorbar.

---

# 20. ROOM / LOBBY DESIGN

## 20.1 Room creation
Campos:
- mode
- selected sets
- timer per step (solo multi competitivo)
- visibility futura opcional
- create button

## 20.2 Lobby UI
- room code / link
- players list
- avatar picker
- selected sets summary
- host controls
- start button
- readiness opcional futura; por ahora no requerida

## 20.3 Countdown
Al iniciar:
- countdown visible
- sonido ligero opcional
- transición al primer step

---

# 21. SCREEN INVENTORY

## 21.1 Home
- logo
- CTA single player
- CTA competitive
- CTA coop
- CTA challenge
- login/register optional
- stats/profile access if logged

## 21.2 Single setup
- set selector
- start button

## 21.3 Room lobby
- players
- avatars
- sets
- timer
- host start

## 21.4 Game screen
- puzzle
- step / attempts info
- guess input
- history
- player statuses
- timer or turn indicator

## 21.5 Result screen
- big reveal card
- outcome
- guess history
- ranking if multi
- replay
- leave room

## 21.6 Profile
- avatar
- summary stats
- records
- achievements
- easiest/hardest/most played cards

---

# 22. MOBILE-FIRST ADAPTATIONS

## 22.1 Layout priorities
1. puzzle image
2. input
3. step info
4. essential status
5. history via drawer

## 22.2 Avoid on mobile
- demasiadas columnas
- side panels permanentes
- texto redundante
- listas largas visibles todo el tiempo

## 22.3 Drawer recomendado
`HistoryDrawer`
- swipe or button open
- muestra guesses previos
- en multi puede mostrar estado de jugadores

---

# 23. PROFILE & STATS

## 23.1 Stats requeridas
- games played
- wins
- losses
- average attempts to win
- best attempts
- best time
- most played cards
- hardest cards
- easiest cards

## 23.2 Achievements sugeridos
- First Blood: primera victoria
- Sharp Eye: win en step 3 o antes
- Consistent Scholar: 5 wins seguidas
- Set Specialist: 10 wins en un mismo set
- Never Give Up: ganar en último step

## 23.3 Cálculo easiest/hardest
Recomendado:
- easiest = cartas con menor promedio de intentos para victorias
- hardest = cartas con mayor promedio de intentos o mayor tasa de derrota

---

# 24. ANALYTICS & OBSERVABILITY

## 24.1 Eventos útiles
- room created
- room joined
- game started
- guess submitted
- game won
- game lost
- reconnect happened
- autocomplete used
- profile viewed

## 24.2 Métricas valiosas
- dropoff antes de primer guess
- promedio de duración de partida
- win rate por set
- tasa de reconexión
- step promedio de solución

## 24.3 Logs recomendados
Backend:
- room lifecycle
- ws connections
- timer firing
- guess validation
- result calculation

---

# 25. SECURITY / INTEGRITY

## 25.1 Reglas
- nunca confiar en estado del cliente
- server valida:
  - si el step es el correcto
  - si ese jugador puede enviar
  - si ya envió en el step
  - si la partida sigue activa

## 25.2 Challenge a friend
Si luego se comparte link con carta específica:
- validar permisos mínimos
- no exponer data sensible
- no permitir enumeración masiva si no hace falta

---

# 26. MVP SCOPE RECOMMENDATION

## 26.1 MVP real
### Fase 1
- single player
- login opcional
- stats básicas
- autocomplete
- result screen
- profile simple

### Fase 2
- competitive multiplayer
- room lobby
- websocket sync
- reconnection

### Fase 3
- cooperative mode
- turn system
- host override

### Fase 4
- challenge a friend
- achievements
- richer stats

## 26.2 Qué NO meter en Fase 1
- chat
- ranking global complejo
- spectating
- custom puzzle selection pública
- demasiadas animaciones

---

# 27. IMPLEMENTATION ORDER

## 27.1 Recommended order
1. base repo + architecture
2. auth + profile shell
3. puzzle query layer
4. single player engine
5. guess normalization + autocomplete
6. result persistence
7. stats/profile page
8. room & lobby model
9. websocket layer
10. competitive mode
11. reconnection
12. coop mode
13. challenge mode

---

# 28. CURSOR PROMPTS — MASTER SET

## 28.1 Prompt 1 — Foundation / App Skeleton
```text
You are a senior full-stack engineer. Build the initial production-grade foundation for a Next.js + Hono + Prisma + Supabase game app called "Guess a Card, Any Card".

Requirements:
- App router structure
- shared TypeScript types folder
- server folder for Hono and WebSocket handlers
- feature-based organization
- clean separation between UI, state, domain logic and transport
- prepare for modes: single, competitive, coop, challenge
- add placeholder pages and route shells
- add basic Tailwind layout
- create reusable UI primitives for panels, buttons, inputs and drawers
- no mock business logic mixed into components
- code must be extensible and clean
```

## 28.2 Prompt 2 — Prisma Schema + DB layer
```text
Create a production-ready Prisma schema for this game app.

Entities required:
- users
- profiles
- puzzles
- puzzle_steps
- rooms
- room_players
- games
- game_players
- guesses
- user_stats
- user_card_stats
- host_puzzle_history
- achievements
- user_achievements

Requirements:
- use enums where appropriate
- add indexes for query-heavy paths
- model guest flows carefully
- preserve referential integrity
- include created_at / updated_at where useful
- include notes/comments in the schema for maintainability

After the schema, generate:
- migration strategy notes
- seed script plan
- repository/service layer outline for puzzle selection and stats updates
```

## 28.3 Prompt 3 — Puzzle Access + Single Player Engine
```text
Implement the single player domain for "Guess a Card, Any Card".

Requirements:
- fetch available sets from puzzles table
- create single-player game from selected sets
- choose a random puzzle
- avoid recent repeats for same host/user when possible
- expose current step image
- accept one guess per step
- normalize guess text
- compare to canonical card name
- on wrong guess, advance to next step
- on correct guess, finish game
- on max step reached without correct guess, lose game
- persist game, player result and guesses
- update user stats if authenticated

Deliver:
- domain services
- repositories
- TypeScript types
- testable pure functions for result calculation
```

## 28.4 Prompt 4 — Autocomplete / Guess UX
```text
Implement a high-quality card name suggestion system for the Guess input.

Requirements:
- consume canonical FaB card source or cached card names
- debounce user input
- return matching suggestions
- support keyboard navigation
- support mouse/tap selection
- keep the UI responsive on mobile
- do not over-autocomplete aggressively
- separate search logic from presentation
- expose a reusable GuessInput component
```

## 28.5 Prompt 5 — Single Player UI
```text
Build the full single player gameplay screen.

Requirements:
- centered puzzle image as the main focal point
- visible step indicator and attempts remaining
- guess input below image
- smooth slide transition between steps
- success and failure state banners
- result screen with:
  - revealed card image
  - correct card name
  - step reached
  - attempts used
  - total time
  - guess history
  - replay and home CTA
- desktop shows persistent history panel
- mobile uses a history drawer CTA
- code should be componentized and production-ready
```

## 28.6 Prompt 6 — Auth + Profile + Stats
```text
Implement optional authentication and profile/stat pages.

Requirements:
- Supabase Auth with Google and Discord OAuth
- guests can still play
- authenticated users have:
  - profile page
  - personal stats
  - best records
  - most played cards
  - hardest cards
  - easiest cards
  - achievements section
- keep profile UI clean and streamer-friendly
- separate auth plumbing from profile presentation
```

## 28.7 Prompt 7 — Room + Lobby
```text
Implement multiplayer room and lobby foundations.

Requirements:
- create room flow
- join room by link/id
- select sets
- choose timer per step for competitive
- avatar selection from predefined hero/card-art based options
- player list in lobby
- host start control
- countdown before match start
- persistent room state on the backend
- app should be ready for native WebSocket integration
```

## 28.8 Prompt 8 — Native WebSocket Server
```text
Implement a native WebSocket layer using Hono for the game.

Requirements:
- room-level communication
- typed event contracts
- client->server commands and server->client state events
- message routing
- validation per event
- reconnect flow with full state snapshot
- no trust in client-side authority
- keep handlers small and composable
- prepare for competitive and coop engines
```

## 28.9 Prompt 9 — Competitive Engine
```text
Implement the competitive multiplayer game engine.

Rules:
- all players see same step at same time
- each player has one guess per step
- step advances when all players submitted or timer expires
- players may submit as soon as the step starts
- winner is lowest attempts, then lowest total time
- persist all guesses and final ranking
- expose enough state for UI:
  - who submitted
  - who is solved
  - timer remaining
  - current step
```

## 28.10 Prompt 10 — Reconnection
```text
Implement robust reconnection for multiplayer sessions.

Requirements:
- detect disconnects
- automatically rejoin room when possible
- restore full room + game state from server
- preserve solved status
- preserve guess history
- preserve current deadline/timer
- allow host disconnect without killing room
- handle reconnect into finished game gracefully
```

## 28.11 Prompt 11 — Cooperative Engine
```text
Implement cooperative multiplayer mode.

Rules:
- same puzzle for all players
- random but fixed player order decided at game start
- only active player can submit the guess for the current step
- if active player disconnects, host may submit on behalf of team
- no internal chat
- show clear turn indicator and team progress
- persist team guess history and final outcome
```

## 28.12 Prompt 12 — Challenge a Friend
```text
Implement the Challenge a Friend mode.

Requirements:
- host can filter by set and choose a specific card/puzzle
- challenge can be played on same device or by sharing a link
- gameplay follows single-player rules
- challenge metadata should preserve who created it and what puzzle was selected
- structure code so challenge mode reuses single-player components wherever possible
```

---

# 29. ACCEPTANCE CRITERIA

## 29.1 Single Player done means
- user can choose sets
- system starts a game
- puzzle renders correctly
- suggestions work
- guesses are persisted
- win/lose works
- result screen works
- registered user stats update correctly

## 29.2 Competitive done means
- room create/join works
- players sync properly
- step advance is correct
- ranking is correct
- reconnection works

## 29.3 Coop done means
- turn order is visible
- only active player can submit
- host override works
- final result is consistent

---

# 30. RISKS & MITIGATIONS

## 30.1 Risk: multiplayer complexity too early
Mitigación:
- single player first
- shared engine abstractions
- typed WS contracts desde el inicio

## 30.2 Risk: repeated puzzle frustration
Mitigación:
- host puzzle history
- recent exclusion window

## 30.3 Risk: autocomplete lag
Mitigación:
- pre-index card names
- debounce
- memoized filtering

## 30.4 Risk: reconnect inconsistency
Mitigación:
- server authoritative snapshot
- idempotent event handling
- room/game persistence

---

# 31. FINAL RECOMMENDATION AS PROJECT LEAD

La mejor forma de llevar esta idea a la realidad es:

1. construir **single player impecable**
2. dejar bien resueltos:
   - puzzle contract
   - guess normalization
   - result persistence
   - profile/stats
3. recién después abrir multiplayer

Eso te da:
- una base sólida
- algo jugable rápido
- menos riesgo arquitectónico
- un producto demostrable antes de la complejidad real-time

---

# 32. NEXT ACTION RECOMMENDED

Empezar inmediatamente con este orden:
1. Foundation / skeleton
2. Prisma schema
3. Puzzle access + single player engine
4. Single player UI
5. Auth + profile
6. Multiplayer foundations

---

# 33. HANDOFF NOTE FOR NEXT CHAT / CURSOR

Este documento es la fuente de verdad del proyecto para comenzar implementación.  
Si otro agente o chat toma el proyecto, debe asumir:
- admin ya existe
- game app es repositorio separado
- Supabase es fuente compartida
- single player es prioridad
- multiplayer viene después, pero ya condicionado por esta arquitectura

