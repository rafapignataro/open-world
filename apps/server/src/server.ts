import http from 'http';
import express, { Express, Request, Response } from 'express';
import { Server as SocketServer, Socket } from 'socket.io';
import { instrument } from '@socket.io/admin-ui';
import cors from 'cors';
import crypto from 'crypto';

const USERS = new Map<string, User>();
const ROOMS = new Map<string, Room>();

type MediaDevices = {
  audio: {
    enabled: boolean;
  };
  video: {
    enabled: boolean;
  }
}

export type User = {
  id: string;
  socket: Socket;
  roomId?: string;
}

export type Participant = {
  userId: string;
  media: MediaDevices;
}

export type CreateRoom = {
  name: string;
  password?: string;
}

interface IRoomParams {
  userId: string;
  roomId: string;
}

interface ToggleMediaParams {
  userId: string;
  type: 'audio' | 'video';
}

export class WebsocketServer {
	private io: SocketServer;
  
	constructor(private server: http.Server) {
		this.io = new SocketServer(this.server, {
			cors: {
				origin: ['http://localhost:4444', 'https://admin.socket.io'], 
				methods: ['GET', 'POST'],
				credentials: true
			}
		});

		this.io.on('connection', socket => {
			const user = this.createUser(socket);

			console.info('USER CONNECTED', user.id);

			socket.emit('connect-user', { id: user.id });

			socket.on('create-room', this.createRoom.bind(this));

			socket.on('join-room', this.joinRoom.bind(this));

			socket.on('leave-room', this.leaveRoom.bind(this));

			socket.on('toggle-media', this.toggleMedia.bind(this));

			socket.on('update-movement', this.updateMovement.bind(this));

			socket.on('update-rotation', this.updateRotation.bind(this));

			socket.on('disconnect', () => {
				console.info(socket.id, 'disconnected');
				const user = Array.from(USERS.values()).find(u => u.socket.id === socket.id);

				if (!user || !user.roomId) return;

				this.leaveRoom({ userId: user.id, roomId: user.roomId });
			});
		});
    
		instrument(this.io, { auth: false });
	}

	private createUser(socket: Socket) {
		const id = crypto.randomUUID();

		const user = { id, socket };

		USERS.set(id, user);
    
		return user;
	}

	private createRoom(data: CreateRoom, callback: (room: RawRoom) => void) {
		const room = new Room({ io: this.io, ...data });

		ROOMS.set(room.id, room);

		this.io.emit('updated-rooms', Array.from(ROOMS.values()).map(room => room.raw()));

		callback(room.raw());
	}
  
	private joinRoom({ userId, roomId }: IRoomParams, cb: (data: RawRoom | null) => void) {
		const user = USERS.get(userId);

		if (!user) return cb(null);

		const room = ROOMS.get(roomId);
  
		if (!room) return cb(null);

		room.addParticipant({ userId });
    
		cb(room.raw());
	}
  
	private leaveRoom({ userId, roomId }: IRoomParams, cb?: () => void) {
		const user = USERS.get(userId);

		if (!user) return;

		const room = ROOMS.get(roomId);
    
		if (!room) return;

		room.removeParticipant({ userId });
  
		if (cb) cb();
	}
  
	private toggleMedia({ userId, type }: ToggleMediaParams, cb?: (data: ToggleMediaParams & { enabled: boolean }) => void) {
		const user = USERS.get(userId);

		if (!user || !user.roomId) return;

		const room = ROOMS.get(user.roomId);
  
		if (!room) return;

		const response = room.toggleParticipantMedia({ userId, type });

		if (response && cb) cb(response);
	}

	private updateMovement({ userId, movement }: { userId: string, movement: Movement}) {
		const user = USERS.get(userId);

		if (!user || !user.roomId) return;

		const room = ROOMS.get(user.roomId);
  
		if (!room) return;

		room.updateParticipantMovement({ userId, movement });
	}

	private updateRotation({ userId, direction }: { userId: string, direction: number }) {
		const user = USERS.get(userId);

		if (!user || !user.roomId) return;

		const room = ROOMS.get(user.roomId);
  
		if (!room) return;

		room.updateParticipantRotation({ userId, direction });
	}
}

export class RestServer {
	public app: Express;

	public http: http.Server;

	constructor() {
		this.app = express();

		this.app.use(cors({ origin: '*' }));

		this.app.get('/rooms', this.listRooms.bind(this));

		this.http = http.createServer(this.app);
	}

	public start() {
		this.http.listen(8080, () => console.info('Server on'));
	}

	private listRooms(request: Request, response: Response) {
		response.json(Array.from(ROOMS.values()).map(room => room.raw()));
	}
}

type Position = { x: number, y: number, z: number };
type Size = { width: number, height: number, length: number };
type Movement = { left: boolean; right: boolean; up: boolean; down: boolean; };
type Velocity = { x: number, y: number; z: number; };
type Rotation = { x: number, y: number; z: number; };

type RoomParticipant = {
  userId: string;
  media: MediaDevices;
  position: Position;
  size: Size;
  movement: Movement;
  velocity: Velocity;
  rotation: Rotation;
}

type RawRoom = {
  id: string;
  name: string;
  participants: RoomParticipant[];
}

type RoomProps = {
  io: SocketServer;
  name: string;
  password?: string;
}

class Room {
	private io: SocketServer;
  
	private gameLoop?: NodeJS.Timer;

	private startedAt = 0;

	private time = 0;

	private fps = 1000 / 30;

	private status: 'STOPPED' | 'RUNNING' = 'STOPPED';

	private map = {
		width: 100,
		height: 100
	};

	public id = crypto.randomBytes(3).toString('hex');

	public name: string;

	private password?: string;

	private participants = new Map<string, RoomParticipant>();

	constructor({ io, name }: RoomProps) {
		console.info('CREATED ROOM', this.raw());

		this.io = io;
    
		this.name = name;
	}

	public start() {
		if (this.status === 'RUNNING') return;

		this.status = 'RUNNING';
		this.startedAt = Date.now();
		this.time = this.startedAt;

		this.gameLoop = setInterval(() => {
			// console.log('TIME PASSED', (this.time - this.startedAt) / 1000);
			this.update();

			// TODO: TURN ON
			this.io.to(this.id).emit('sync-room-world', {
				participants: Array.from(this.participants.values())
			});
      
			this.time += this.fps;
		}, this.fps);
	}

	public stop() {
		this.status = 'STOPPED';
		clearInterval(this.gameLoop);
	}

	private update() {
		for (const participant of Array.from(this.participants.values())) {
			const { movement, position, velocity, rotation } = participant;

			if (!movement.up && !movement.down && !movement.left && !movement.right) return;

			const radAngle = degToRad(rotation.y);

			const newX = (Math.sin(radAngle) * velocity.x);
			const newZ = (Math.cos(radAngle) * velocity.z);
      
			if (movement.up) {
				position.x += newX;
				position.z += newZ;
			}
			if (movement.down) {
				position.x -= newX;
				position.z -= newZ;
			}

			if (movement.left || movement.right) {
				const angle = radAngle + Math.PI / 2 * (movement.left ? 1 : -1);

				const newX = (Math.sin(angle) * velocity.x);
				const newZ = (Math.cos(angle) * velocity.z);

				position.x += newX;
				position.z += newZ;
			}
		}
	}

	public addParticipant({ userId }: { userId: string }) {
		console.info('JOINED ROOM', this.id, userId);

		const user = USERS.get(userId);

		if (!user) return null;

		const participantAlreadyJoined = this.participants.get(userId);

		if (participantAlreadyJoined) return;
  
		user.socket.join(this.id);

		user.roomId = this.id;

		const randomX = Number((Math.random() * 8 - 4).toFixed(2));
		const randomY = Number((Math.random() * 8 - 4).toFixed(2));

		const participant: RoomParticipant = {
			userId: user.id,
			media: {
				audio: {
					enabled: false,
				},
				video: {
					enabled: false,
				}
			},
			position: { x: randomX, y: 10, z: randomY },
			size: { width: 10, height: 15, length: 10 },
			velocity: {
				x: 1.5,
				y: 0,
				z: 1.5,
			},
			movement: {
				left: false,
				right: false,
				up: false,
				down: false
			},
			rotation: {
				x: 0,
				y: 0,
				z: 0
			}
		};
    
		this.participants.set(userId, participant);
  
		user.socket.to(this.id).emit('participant-joined', participant);

		if (this.status === 'STOPPED') this.start();
  
		return participant;
	}

	public removeParticipant({ userId }: { userId: string }) {
		console.info('LEFT ROOM', this.id, userId);
  
		const user = USERS.get(userId);

		if (!user) return;

		this.participants.delete(userId);
  
		user.socket.leave(this.id);
		user.socket.to(this.id).emit('participant-disconnected', { userId });

		if (this.participants.size === 0) this.stop();
	}

	public toggleParticipantMedia({ userId, type }: ToggleMediaParams) {
		const user = USERS.get(userId);

		if (!user || !user.roomId) return;

		const participant = this.participants.get(userId);

		if (!participant) return;
  
		const enabled = !participant.media[type].enabled;

		participant.media[type].enabled = enabled;
    
		console.info('TOGGLE MEDIA', { userId, type, enabled });

		user.socket.to(user.roomId).emit('participant-media', { 
			userId, 
			type, 
			enabled
		});

		return { 
			userId, 
			type, 
			enabled
		};
	}

	public updateParticipantMovement({ userId, movement }: { userId: string, movement: Movement }) {
		console.info('UPDATE MOVEMENT', { userId, movement });

		const user = USERS.get(userId);

		if (!user || !user.roomId) return;

		const participant = this.participants.get(userId);

		if (!participant) return;

		participant.movement = movement;
	}

	public updateParticipantRotation({ userId, direction }: { userId: string, direction: number }) {

		const user = USERS.get(userId);

		if (!user || !user.roomId) return;

		const participant = this.participants.get(userId);

		if (!participant) return;

		const step = 1;

		let newRotationY = participant.rotation.y + (step * direction);

		if (newRotationY > 360) newRotationY = step;

		if (newRotationY < 0) newRotationY = 360;

		participant.rotation.y = newRotationY;

		console.info('UPDATE ROTATION', { userId, direction, rotation: newRotationY });
    
	}

	public raw(): RawRoom {
		return {
			id: this.id,
			name: this.name,
			participants: Array.from(this.participants.values()),
		};
	}
}

function radToDeg(rad: number){
	let deg =  Math.floor((rad * 180) / Math.PI);

	while (deg < 0) deg += 360;
	while (deg >= 360) deg -= 360;
	return deg;
}

function degToRad(deg: number) {
	return (deg * Math.PI) / 180;
}