import { Center, Spinner } from "@chakra-ui/react";

export function PageLoading() {
  return (
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
}