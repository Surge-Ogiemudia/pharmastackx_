
import { NextApiRequest } from 'next';
import { NextApiResponseWithSocket, initSocket } from '@/socket';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.IO...');
    initSocket(res.socket.server);
  }
  res.end();
}
