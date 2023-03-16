import { create } from 'zustand';

import { User, useUser } from './userStore';

export type MediaDevices = {
  audio: {
    enabled: boolean;
    stream?: MediaStream;
  },
  video: {
    enabled: boolean;
    stream?: MediaStream;
  }
}

export type Participant = {
  userId: string;
  media: MediaDevices;
}

type JoinParams = {
  user: User;
  roomId: string
}

type LeaveParams = JoinParams;

type UpdateMediaParams = {
  userId: string;
  type: 'audio' | 'video';
  enabled?: boolean;
  stream?: MediaStream;
}

export type Room = {
  id: string;
  name: string;
  participants: Participant[];
}

type RoomStore = { 
  room?: {
    id: string;
    name: string;
  }
  participants: Participant[];
  joined: boolean;
  alreadyTried: boolean;
  error?: {
    message: string;
  },
  join: (params: JoinParams) => void;
  leave: (params: JoinParams) => void;
  callParticipant: (fromId: string, toId: string, stream: MediaStream) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateMedia: (params: UpdateMediaParams) => void;
  reset: () => void;
}

export const DEFAULT_MEDIA = {
  audio: {
    enabled: false,
  },
  video: {
    enabled: false,
  }
}

const DEFAULT_ROOM_DATA = {
  room: undefined,
  participants: [],
  joined: false,
  alreadyTried: false,
  error: undefined
}

export const useRoom = create<RoomStore>((set, get) => ({
  ...DEFAULT_ROOM_DATA,
  join: async ({ user, roomId }: JoinParams) => {
    const { alreadyTried } = get();

    console.info('* JOINING ROOM');

    if (alreadyTried) return;

    user.socket.emit('join-room', { userId: user.id, roomId }, (room: Room) => {
      if (!room) {
        console.info('* ERROR TO JOIN ROOM')
        
        return set({ 
          alreadyTried: true,
          joined: false, 
          error: {
            message: 'This room does not exist!'
          }
        })
      }

      console.info('* JOINED ROOM', room)
      set({ 
        alreadyTried: true,
        joined: true,
        room: {
          id: room.id,
          name: room.name
        },
        participants: room.participants, 
      })
    });
  },
  leave: ({ user, roomId }: LeaveParams) => {
    user.socket.emit('leave-room', { userId: user.id, roomId });
  },
  callParticipant: (fromId, toId, stream) => {
    const user = useUser.getState().user;
    
    if (!user) return;

    const { participants } = get();

    const fromParticipant = participants.find(p => p.userId === fromId);

    if (!fromParticipant) return;

    const toParticipant = participants.find(p => p.userId === toId);

    if (!toParticipant) return;

    if (!toParticipant.media.audio.enabled && !toParticipant.media.video.enabled) return;

    const call = user.peer.call(toId, stream);

    console.info('* CALLING USER', toId);

    call.on('stream', (participantStream: MediaStream) => {
      console.info('* SUCCESS CALLED', toId, participantStream);

      const newParticipants = participants.map(p => {
        if (p.userId !== toId) return p;
  
        p.media['video'].stream = participantStream;

        participantStream.getAudioTracks()[0].enabled = false;
        participantStream.getVideoTracks()[0].enabled = false;
        
        return p;
      });
      
      set({ participants: newParticipants })
    });

    call.on('error', (err) => console.info('* ERROR TO CALL', err))
  },
  addParticipant: (participant) => {
    console.info('JOINED ROOM', participant);
    const { participants } = get();

    const participantAlreadyJoined = participants.find(p => p.userId === participant.userId);

    if (participantAlreadyJoined) return;

    set({ participants: [...participants, participant] }) 
  },
  removeParticipant: (userId) => set(state => {
    console.info('LEFT ROOM', userId)

    return { participants: state.participants.filter(p => p.userId !== userId) };
  }),
  updateMedia: ({ userId, type, enabled, stream }) => {
    if (enabled === undefined && stream === undefined) return;

    const { participants } = get();

    const participant = participants.find(p => p.userId === userId);
    
    if (!participant) return;

    const newParticipants = participants.map(p => {
      if (p.userId !== userId) return p;

      const pStream = p.media[type].stream;

      if (enabled !== undefined) {
        p.media[type].enabled = enabled;
        if (!enabled && pStream) {
          if (type === 'audio') pStream.getAudioTracks()[0].enabled = false;
          if (type === 'video') pStream.getVideoTracks()[0].enabled = false;
        } 
      }
      
      if (stream !== undefined) p.media[type].stream = stream;

      return p;
    })

    set({ participants: newParticipants });
  },
  reset: () => set(DEFAULT_ROOM_DATA),
}));

export async function getUserMedia(type: 'audio' | 'video') {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    return stream
  } catch (err) {
    console.log('getUserMedia error', err)
    return undefined
  }
}