import { CompetitiveRoomClient } from "@/app/(public)/competitive/room/[id]/competitive-room-client";

export default async function CompetitiveRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CompetitiveRoomClient roomId={id} />;
}
