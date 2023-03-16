import { Socket } from "socket.io-client";
import { create } from "zustand";

export type Peer = import('peerjs').default;

export type UserMedia = {
  enabled: boolean;
  stream?: MediaStream;
}

export type User = {
  id: string;
  socket: Socket;
  peer: Peer;
}

type CreateUser = Omit<User, 'peer'>;

type UserStore = {
  user?: User;
  create: (data: CreateUser) => Promise<void>;
}

export const useUser = create<UserStore>((set, get) => ({
  create: async (user) => {
    const p = (await import('peerjs')).default;

    const peer = new p(user.id);

    peer.on('open', () => {
      console.info('* CONNECTED TO PEER');

      set({ user: { ...user, peer } })
    }) 
  },
}));