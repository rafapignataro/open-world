import { Center, Avatar, Spinner, Box, Flex, Icon, HStack, AspectRatio, Text } from "@chakra-ui/react";
import { useRef, useEffect, memo, RefObject } from "react";
import { FaCamera, FaMicrophone } from "react-icons/fa";
import { Participant } from "../../../store/roomStore";

type ParticipantVideoProps = {
  isUser?: boolean;
  participant: Participant;
}

export function RoundedVideo({ isUser, participant }: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    videoRef.current.srcObject = participant.media.video.stream || null;
  }, [participant.media.video.stream, participant.media.audio.stream]);

  const { userId, media } = participant;

  const participantName = userId.split('-')[0];

  const stream = media.video.stream || media.audio.stream;

  return (
    <Box 
      w="24" h="24"
      position="relative"
      _hover={{ 
        _after: { 
          content: `"${participantName}"`,
          position: 'absolute', 
          top: '110%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 'sm',
          rounded: 'md',
          px: 2, 
          py: 1, 
          bg: 'gray.100', 
          fontWeight: 'bold' 
        } 
      }}
    >
      <Center
        w="24" h="24"
        bg="gray.200"
        rounded="full" 
        overflow="hidden"
        position="relative"
        border="3px solid white"
      >
        {!media.video.enabled && <Avatar name={participantName} w="100%" h="100%" />}
        <Box 
          as="video" 
          ref={videoRef as RefObject<HTMLVideoElement & HTMLDivElement>} 
          autoPlay 
          muted={!media.audio.enabled}
          w="auto" 
          h="100%" 
          maxW="fit-content"
          display={media.video.enabled ? 'block' : 'none'}
        />
        {media.video.enabled  && !stream && (
          <Spinner
            thickness="2px"
            speed="0.65s"
            emptyColor="gray.200"
            color="green.500"
            width="18px"
            height="18px"
          />
        )}
        
      </Center>
      {!isUser && <HStack position="absolute" left="50%" transform="translateX(-50%)" bottom="0"> 
        <Center p="1.5" rounded="full" bg={media.audio.enabled ? 'green.500' : 'red.500'}>
          <Icon as={FaMicrophone} w="3" h="3" color="white"  />
        </Center>
        <Center p="1.5" rounded="full" bg={media.video.enabled ? 'green.500' : 'red.500'}>
          <Icon as={FaCamera} w="3" h="3" color="white"/>
        </Center>
      </HStack>}
    </Box>
  )
}

export function ParticipantVideo({ isUser, participant }: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    videoRef.current.srcObject = participant.media.video.stream || null;
  }, [participant.media.video.stream, participant.media.audio.stream]);

  const { userId, media } = participant;

  const participantName = userId.split('-')[0];

  return (
    <AspectRatio
      w="40"
      rounded="lg"
      bg="gray.100"
      overflow="hidden"
    >
      <Box position="relative" w="100%" h="100%">
        <Box 
          as="video" 
          ref={videoRef as RefObject<HTMLVideoElement & HTMLDivElement>} 
          zIndex="1"
          position="absolute"
          top="0"
          left="0"
          autoPlay 
          // muted 
          w="auto" 
          h="100%" 
          maxW="fit-content"
        />
        {!media.video.enabled && (
          <Center zIndex="2" position="absolute" top="0" left="0" w="100%" h="100%" bg="gray.200" rounded="lg">
            <Text fontSize="lg" color="gray.900" fontWeight="bold">{participantName}</Text>
          </Center>
        )}
        {media.video.enabled && !media.video.stream && (
          <Center zIndex="3" position="absolute" top="0" left="0" w="100%" h="100%" bg="gray.200" rounded="lg">
            <Spinner size='sm' />
          </Center>
        )}
        {!isUser && !media.audio.enabled && (
          <Center 
            zIndex="4"
            position="absolute" 
            top="5%" 
            right="5%" 
            p="2" 
            rounded="full" 
            bg={media.audio.enabled ? 'green.500' : 'gray.100'}
            _after={{ 
              content: "''",
              position: 'absolute', 
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(45deg)',
              rotate: '',
              width: "75%",
              height: '2px',
              bg: 'gray.600'
            }}
          >
            <Icon as={FaMicrophone} w="3.5" h="3.5" color={media.audio.enabled ? 'white' : 'gray.800'} />
          </Center>
        )}
      </Box>
    </AspectRatio>
  )
}