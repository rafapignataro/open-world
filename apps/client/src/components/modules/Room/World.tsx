import { Flex } from "@chakra-ui/react";
import { useEffect, useRef,  } from "react"

import { useRoom } from "../../../store/roomStore";
import { User, useUser } from "../../../store/userStore";
import { Game } from "./Game";

export function World() {
  const participants = useRoom(state => state.participants);
  const user = useUser(state => state.user) as User;

  const gameRef = useRef<Game>();

  useEffect(() => {
    gameRef.current = new Game(user, user.socket);

    user.socket.on('sync-room-world', (data) => {
      if (!gameRef.current) return;

      gameRef.current.update(data);
    });
  }, []);

  return (
    <Flex h="100%" w="100%" id="game-container" />
  )
}