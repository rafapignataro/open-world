import { Flex, IconButton, Icon, Divider, HStack, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { FaDoorOpen, FaMicrophone, FaCamera } from "react-icons/fa";

import { DEFAULT_MEDIA, getUserMedia, Room, useRoom } from "../../../store/roomStore";
import { useUser } from "../../../store/userStore";

type HeaderProps = {
  room: Room;
}

type ToggleMediaCallback = {
  userId: string;
  type: 'audio' | 'video';
  enabled: boolean;
}

export function Header({ room }: HeaderProps) {
  const router = useRouter();

  const user = useUser(state => state.user);

  const callParticipant = useRoom(state => state.callParticipant);
  const leaveRoom = useRoom(state => state.leave);
  const participants = useRoom(state => state.participants);
  const updateMedia = useRoom(state => state.updateMedia);

  function handleLeaveRoom() {
    if (!user) return;

    leaveRoom({ user, roomId: room.id });
    router.push('/');
  }

  async function handleToggleMedia(type: 'audio' | 'video') {
    if (!user) return;

    const currentParticipant = participants.find(p => p.userId === user.id);

    if (!currentParticipant) return;

    const { enabled, stream } = currentParticipant.media[type];

    let userStream: MediaStream | undefined = stream;

    const updateMediaSocket = { userId: user.id, type };

    if (!enabled && !stream) {
      if (!userStream) {
        console.log('ACCESSING DEVICE')

        const accessMedia = await getUserMedia(type);

        if (!accessMedia) {

          return alert('Access to media device blocked. Please, turn permission on.')
        };

        userStream = accessMedia;
      }
    }

    user.socket.emit('toggle-media', updateMediaSocket,  (data: ToggleMediaCallback) => {
      const updateMediaStore: Parameters<typeof updateMedia>[0] = data;

      if (userStream) {
        // if (type === 'audio') userStream.getAudioTracks()[0].enabled = data.enabled;
        // if (type === 'video') userStream.getVideoTracks()[0].enabled = data.enabled;

        if (data.enabled) updateMediaStore['stream'] = userStream
      }

      updateMedia(updateMediaStore);

      if (!data.enabled) return;
      
      const participantsToCall = room.participants
        .filter(p => p.userId !== user.id && !p.media.video.stream);

      console.info('* PART. TO CALL', participantsToCall.map(p => p.userId));

      participantsToCall.forEach(async (p) => callParticipant(user.id, p.userId, userStream as MediaStream))
    });
  }

  const userMedia = user && participants.find(p => p.userId === user.id)?.media || DEFAULT_MEDIA;

  return (
    <Flex h="14" w="100%" px="4" bg="gray.200" align="center">
      <IconButton 
        size="sm"
        aria-label="leave room"
        icon={<Icon as={FaDoorOpen} />} 
        onClick={() => handleLeaveRoom()}
      />
      <Text ml="4" fontSize="2xl" fontWeight="bold" color="gray.700">{room.name}</Text>
      <Divider orientation="vertical" w="0.5" h="60%" bg="gray.400" mx="5" />
      <HStack spacing={4}>
        <IconButton 
          aria-label="Toggle audio media"
          size="sm"
          rounded="full"
          icon={<Icon as={FaMicrophone} />}
          color={userMedia.audio.enabled ? 'green.400' : 'red.400'}
          onClick={() => handleToggleMedia('audio')}
        />
        <IconButton 
          aria-label="toggle video media"
          size="sm"
          rounded="full"
          icon={<Icon as={FaCamera} />} 
          colorScheme="gray"
          color={userMedia.video.enabled ? 'green.400' : 'red.400'}
          onClick={() => handleToggleMedia('video')}
        />
      </HStack>
    </Flex>
  )
}
