import { useRouter } from 'next/router';

import { RoomPage } from '../../components/modules/Room';
import { PageLoading } from '../../components/shared/PageLoading';

export default function Room() {
  const router = useRouter();
  const roomId = String(router.query.id);

  if (!roomId) return <PageLoading />

  return <RoomPage roomId={roomId} />;
}

