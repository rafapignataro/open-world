import { Avatar, AvatarGroup, Box, Button, Center, Container, Flex, Input, SimpleGrid, Text, useDisclosure, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { Room, useRoom } from '../../../store/roomStore';
import { User, useUser } from '../../../store/userStore';
import { CreateRoomModal } from './CreateRoomModal';

export function HomePage() {
  const router = useRouter();

  const user = useUser(state => state.user) as User;

  const reset = useRoom(state => state.reset);

  const [rooms, setRooms] = useState<Room[]>([]);

  const { isOpen, onOpen, onClose } = useDisclosure()

  async function handleJoinRoom(roomId: string) {
    if (!user) return;

    router.push('/room/' + roomId);
  }

  useEffect(() => {
    reset();

    (async () => {
      const response = await fetch('http://localhost:8080/rooms');

      const data = await response.json() as Room[];

      setRooms(data);
    })();

    user.socket.on('updated-rooms', (rooms: Room[]) => setRooms(rooms));

  }, [])

  return (
    <Box height="100vh" bg="gray.50">
      <Container maxW="container.lg">
        <Flex justify="space-between" align="center" py="10">
          <Text fontSize="3xl" color="gray.700" fontWeight="bold">Open World</Text>
          <Button colorScheme="green" onClick={() => onOpen()}>CREATE ROOM</Button>
        </Flex>
        <Box>
        <Text fontSize="2xl" color="gray.600" fontWeight="bold" mb="4">Rooms</Text>
        <SimpleGrid w="100%" columns={[1, 1, 2, 3]} gap={6}>
          {rooms.map(room => (
            <VStack key={room.id} p="4" bg="gray.100" rounded="md" spacing={4}>
              <VStack w="100%" align="flex-start" spacing={1}>
                <Text fontSize="xl" fontWeight="semibold" color="gray.900">{room.name}</Text>
                <AvatarGroup size="sm" max={4}>
                  {room.participants.map(p => <Avatar key={p.userId} name={p.userId} showBorder />)}
                </AvatarGroup>
              </VStack>
              <Flex w="100%" justify="flex-end">
                <Button colorScheme="green" size="sm" ml="auto" onClick={() => handleJoinRoom(room.id)}>JOIN ROOM</Button>
              </Flex>
            </VStack>
          ))}
        </SimpleGrid>
        </Box>
      </Container>
      <CreateRoomModal isOpen={isOpen} onClose={onClose} />
    </Box>
  )
}
