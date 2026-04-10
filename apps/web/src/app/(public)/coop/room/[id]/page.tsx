import { CoopRoomClient } from "@/app/(public)/coop/room/[id]/coop-room-client";

export default async function CoopRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CoopRoomClient roomId={id} />;
}
