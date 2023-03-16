import React from "react"
import { useRouter } from "next/router";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, FormControl, FormLabel, Input, ModalFooter, Button, VStack } from "@chakra-ui/react"

import { User, useUser } from "../../../store/userStore";
import { Room } from "../../../store/roomStore";

import roomNames from '../../../data/roomNames.json';
import { useForm } from "react-hook-form";

type CreateRoomFormFiels = {
  name: string;
  password: string;
}

type CreateRoomModalProps = {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const router = useRouter();
  const { handleSubmit, register, formState: { errors, isSubmitting } } = useForm<CreateRoomFormFiels>();

  const user = useUser(state => state.user) as User;

  const inputPlaceholder = roomNames[Math.floor(Math.random() * roomNames.length)];

  async function handleCreateRoom(data: CreateRoomFormFiels) {
    user.socket.emit('create-room', data, ({ id }: Room) => {
      router.push('/room/' + id)
    });
  }

  return (
    <Modal isOpen={isOpen}
      onClose={onClose}
    >
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit(handleCreateRoom)}>
        <ModalHeader>Create a room</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4}>
            <FormControl isRequired={true} isInvalid={!!errors && !!errors.name} isDisabled={isSubmitting}>
              <FormLabel htmlFor="name">Name</FormLabel>
              <Input id="name" type="text" placeholder={inputPlaceholder} {...register('name', { required: true })}/>
            </FormControl>
            <FormControl isDisabled={isSubmitting}>
              <FormLabel htmlFor="password">Password</FormLabel>
              <Input id="password" type="password" {...register('password')}/>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="green" w="100%" type="submit" isLoading={isSubmitting}>
            CREATE
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}