import { Socket } from 'socket.io-client';
import * as THREE from 'three';
import { MediaDevices, Participant, useRoom } from "../../../store/roomStore";
import { User, useUser } from "../../../store/userStore";

function radToDeg(rad: number){
  let deg =  (rad * 180) / Math.PI;

  while (deg < 0) deg += 360;
  while (deg >= 360) deg -= 360;
  return deg;
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

type Position = { x: number, y: number, z: number };
type Size = { width: number, height: number, length: number };
type Movement = { left: boolean; right: boolean; up: boolean; down: boolean; };
type Rotation = { x: number, y: number, z: number };

type GameParticipant = {
  userId: string;
  media: MediaDevices;
  position: Position;
  size: Size;
  movement: Movement;
  rotation: Rotation;
  gameObject: THREE.Mesh;
  isUser: boolean;
}

export class Game {
  private container: Element;

  private width: number;

  private height: number;

  public scene: THREE.Scene;

  private camera: Camera;

  public renderer: THREE.WebGLRenderer;

  private participants = new Map<string, GameParticipant>();

  private mousePressed = false;

  private mousePosition: { x: number; y: number } = { x: 0, y: 0};

  constructor(private user: User, private socket: Socket) {
    const container = document.getElementById('game-container');

    if (!container) throw new Error('Game Container not found');

    this.container = container;

    const { width, height } = this.container.getBoundingClientRect();
    this.width = width;
    this.height = height;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#fafafa');

    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    
    this.camera = new Camera(this);

    this.scene.add(new THREE.AxesHelper(200));
    this.scene.add(new THREE.GridHelper());
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // Floor
    (() => {
      const groundGeometry = new THREE.PlaneGeometry(100, 100);
      const groundMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color('#000000') });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);

      ground.position.set(0, 0, 0)
      ground.rotation.x = -Math.PI / 2;

      this.scene.add(ground);
    })();

    this.container.innerHTML = '';
    this.container.append(this.renderer.domElement)
    
    this.configEvents();
  }

  private configEvents() {
    window.addEventListener('resize', () => {
      const { width, height } = this.container.getBoundingClientRect();

      const aspectRatio = width / height;
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(width, height);

      this.camera.updateAspect(aspectRatio);
    })
    window.addEventListener('mousedown', () => {
      this.mousePressed = true;
    });
    window.addEventListener('mouseup', () => {
      this.mousePressed = false;
    });
    window.addEventListener('mousemove', ({ clientX, clientY }) => {
      if (!this.mousePressed) return;

      const user = this.participants.get(this.user.id);

      if (!user) return;

      const direction = clientX - this.mousePosition.x > 0 ? 1 : -1;

      this.mousePosition = { x: clientX, y: clientY };

      this.socket.emit('update-rotation', { userId: this.user.id, direction });
    });
    window.addEventListener('keydown', (e) => {
      const user = this.participants.get(this.user.id);

      if (!user) return;

      switch(e.key) {
        case 'a':
          if (user.movement.left) return;
          user.movement.left = true;
          break;
        case 'd':
          if (user.movement.right) return;
          user.movement.right = true;
          break;
        case 'w':
          if (user.movement.up) return;
          user.movement.up = true;
          break;
        case 's':
          if (user.movement.down) return;
          user.movement.down = true;
          break;
      }

      this.socket.emit('update-movement', { userId: user.userId, movement: user.movement });
    });
    window.addEventListener('keyup', (e) => {
      const user = this.participants.get(this.user.id);

      if (!user) return;

      switch(e.key) {
        case 'a':
          if (!user.movement.left) return;
          user.movement.left = false;
          break;
        case 'd':
          if (!user.movement.right) return;
          user.movement.right = false;
          break;
        case 'w':
          if (!user.movement.up) return;
          user.movement.up = false;
          break;
        case 's':
          if (!user.movement.down) return;
          user.movement.down = false;
          break;
      }

      this.socket.emit('update-movement', { userId: user.userId, movement: user.movement });
    });
  }

  public update({ participants }: { participants: GameParticipant[] }) {
    for (const participant of participants) {
      if (!this.participants.get(participant.userId)) {
        this.createParticipant(participant)
      }

      const gameParticipant = this.participants.get(participant.userId);

      if (!gameParticipant) return;

      gameParticipant.gameObject.position.x = participant.position.x;
      gameParticipant.gameObject.position.z = participant.position.z;
      // gameParticipant.gameObject.position.y = participant.position.y;

      // gameParticipant.gameObject.rotation.x = participant.rotation.x;
      // gameParticipant.gameObject.rotation.y = participant.rotation.y;
      gameParticipant.gameObject.rotation.y = degToRad(participant.rotation.y);
    }

    const user = this.participants.get(this.user.id);

    if (user) this.camera.follow(user);


    this.camera.update();

    this.renderer.render(this.scene, this.camera.camera);
  }

  private createParticipant(data: GameParticipant) {
    const isUser = data.userId === this.user.id;

    const color = new THREE.Color(isUser ? 'green' : 'red');

    const gameObject = new THREE.Mesh(
      new THREE.BoxGeometry(data.size.width, data.size.height, data.size.length), 
      new THREE.MeshBasicMaterial({ color: color })
    );

    gameObject.position.set(data.position.x, data.position.y, data.position.z);

    this.participants.set(data.userId, {
      ...data,
      gameObject,
      isUser,
    })

    this.scene.add(gameObject)
  }
}

class Camera {
  private following?: GameParticipant;

  public camera = new THREE.PerspectiveCamera(75, 16 / 9, 1, 10000);

  public offsetDistance: number = 10;

  public offset: Position = { x: 0, y: 20, z: -25 }

  constructor(private game: Game) {
    this.camera.position.set(this.offset.x, this.offset.y, this.offset.z);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    game.scene.add(this.camera);
  }
  
  public update() {
    if (this.following) {
      // this.camera.position
      // .copy(this.following.gameObject.position)
      // .add(new THREE.Vector3(0, 25, -30));

      this.camera.rotation.y = this.following.gameObject.rotation.y

      this.camera.lookAt(this.following.gameObject.position);
      this.following.gameObject.add(this.camera);
    }
  }

  public follow(participant: GameParticipant) {
    this.following = participant;
  }

  public updateAspect(aspectRatio: number) {
    this.camera.aspect = aspectRatio;
    this.camera.updateProjectionMatrix();
  }

  public updateRotation(rotation: number) {
    this.camera.rotation.z = rotation;
  }

  public updateOffset(distance: number) {

  }
}