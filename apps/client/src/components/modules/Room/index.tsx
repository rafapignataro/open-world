import { useEffect, useRef } from 'react'
import { Box, Center, Flex, Link, Spinner, Text, useToast, VStack } from '@chakra-ui/react'
import NextLink from 'next/link';

import { Participant, useRoom } from '../../../store/roomStore';
import { useUser } from '../../../store/userStore';

import { Header } from './Header';
import { ParticipantVideo } from './ParticipantVideo';
import { World } from './World';

type RoomPageProps = {
  roomId: string;
}

export function RoomPage({ roomId }: RoomPageProps) {
  const toast = useToast();

  const user = useUser(state => state.user);

  const room = useRoom(state => state.room);
  const participants = useRoom(state => state.participants);
  const joined = useRoom(state => state.joined);
  const roomError = useRoom(state => state.error);

  const joinRoom = useRoom(state => state.join);
  const addParticipant = useRoom(state => state.addParticipant);
  const removeParticipant = useRoom(state => state.removeParticipant);
  const updateMedia = useRoom(state => state.updateMedia);

  const onJoin = useRef(false);
  const onEventsSet = useRef(false);
  const onPeerEventSet = useRef(false);

  useEffect(() => {
    if (!user) return;

    if (!joined && !onJoin.current) {
      onJoin.current = true;

      joinRoom({ user, roomId });
    };

    if (!joined) return;

    if (!onPeerEventSet.current) {
      console.info('* SET PEER EVENTS');
      onPeerEventSet.current = true;

      user.peer.on('call', (call) => {
        console.info('* RECEIVING CALL FROM', call.peer);

        const storeParticipants = useRoom.getState().participants;

        const u = storeParticipants.find(p => p.userId === user.id);

        if (!u) return;

        const userStream = u.media.video.stream || u.media.video.stream;
  
        if (!userStream) {
          console.info('* REFUSED CALL BECAUSE OF NO STREAM')
          return;
        };
  
        const participant = storeParticipants.find(p => p.userId === call.peer);
  
        if (!participant) return;
  
        call.answer(userStream);
        
        call.on('stream', (participantStream: MediaStream) => {
          console.info('* RECEIVED CALL STREAM')
          updateMedia({
            userId: participant.userId,
            type: 'video',
            stream: participantStream
          });
        })
      });
    }

    if (!onEventsSet.current) {
      console.info('* SET SOCKET EVENTS');
      onEventsSet.current = true;

      user.socket.on('participant-joined', async (participant: Participant) => { 
        addParticipant(participant)
        toast({
          title: `${participant.userId.split('-')[0]} entrou na sala`,
          variant: 'left-accent',
          position: 'bottom-left',
          status: 'info'
        })
      });

      user.socket.on('participant-media', (data) => updateMedia(data));
  
      user.socket.on('participant-disconnected', ({ userId }: Participant) => { 
        removeParticipant(userId)
        toast({
          title: `${userId.split('-')[0]} saiu da sala`,
          variant: 'left-accent',
          position: 'bottom-left',
          status: 'info'
        })
      });
    }
  }, [joined, user])

  if (roomError) return (
    <Flex h="100vh" justify="center" align="center" direction="column">
      <Text fontSize="2xl" fontWeight="bold" mt="-2" color="gray.900" mb="6">
        {roomError.message} 
      </Text>
      <Link as={NextLink} href="/" variant="" colorScheme="green" fontSize="xl">HOME</Link>
    </Flex>
  )

  if (!user || !room || !joined) return (
    <Center h="100vh">
      <Spinner
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.200"
        color="green.500"
        width="64px"
        height="64px"
      />
    </Center>
  )

  return (
    <Box h="100vh" w="100%" bg="gray.50">
      <Header room={{ ...room, participants }} />
      <Box w="100%" h="calc(100vh - 3.5rem)" position="relative">
        <World />
        <VStack zIndex="2" position="absolute" top="4" right="4" spacing={4}>
          {participants.map(p => <ParticipantVideo key={p.userId} isUser={p.userId === user.id} participant={p} /> )}
        </VStack>
      </Box>
    </Box>
  )
}