import { RestServer, WebsocketServer } from './server';

const restServer = new RestServer();

new WebsocketServer(restServer.http);

restServer.start();