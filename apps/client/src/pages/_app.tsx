import type { AppProps } from 'next/app';
import { Box, Center, ChakraProvider, Progress, Text, VStack } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import socketIO from 'socket.io-client';

import { useUser } from '../store/userStore';
import { PageLoading } from '../components/shared/PageLoading';

import { theme } from '../styles/theme';

const WS = 'http://localhost:8080';

export default function App({ Component, pageProps }: AppProps) {
  const connectedRef = useRef(false)

  const user = useUser(state => state.user);
  const createUser = useUser(state => state.create);

  const [loadingValue, setLoadingValue] = useState(0);

  const loadingIntervalRef = useRef<NodeJS.Timer | null>(null);

  useEffect(() => {
    if (connectedRef.current) return;

    connectedRef.current = true;

    const socket = socketIO(WS);

    socket.on('connect-user', async ({ id }) => await createUser({ id, socket }));

    if (loadingIntervalRef.current) return;

    loadingIntervalRef.current = setInterval(() => {
      setLoadingValue(v => {
        const randomValue = Math.floor(Math.random() * 20) + 8;

        if (v + randomValue > 100) {
          if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current)

          return 100;
        }

        return v + randomValue
      });
    }, 100);

    return () => {
      if (user && user.peer) user.peer.destroy();
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    }
  }, [])

  return (
    <ChakraProvider theme={theme}>
      {user && loadingValue === 100 ? <Component {...pageProps } /> : <AppLoading value={loadingValue} />}
    </ChakraProvider>
  )
}

function AppLoading({ value }: { value: number }) {
  return (
    <Center w="100%" h="100vh" bg="gray.50">
      <VStack spacing={20}>
        <Text fontSize="6xl" fontWeight="bold" color="gray.800">Open World</Text>
        <VStack w="100%">
          <Text fontSize="sm"fontWeight="semibold" color="gray.600">LOADING {value}%</Text>
          <Box w="100%" h="3" bg="gray.200" rounded="sm" overflow="hidden">
            <Box h="100%" bg="green.500" w={`${value}%`} transition="all .5s">

            </Box>
          </Box>
        </VStack>
      </VStack>
    </Center>
  )
}
