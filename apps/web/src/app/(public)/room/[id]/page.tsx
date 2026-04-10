import { RouteShell } from "@/components/layout/route-shell";
import { RoomLobby } from "@/components/room/RoomLobby";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RouteShell
      title="Gathering circle"
      description="Those who hold the link arrive here before the omen is chosen — avatars, sets, and host rites connect when the room wakes."
    >
      <RoomLobby roomId={id} />
    </RouteShell>
  );
}
