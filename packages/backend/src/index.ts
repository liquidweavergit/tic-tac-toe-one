import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/user';
import { registerLobbyNamespace } from './socket/lobbyHandler';

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/v1', authRouter);
app.use('/api/v1', userRouter);

export const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:3000', credentials: true },
});

registerLobbyNamespace(io);

if (require.main === module) {
  const PORT = process.env.PORT ?? 4000;
  httpServer.listen(PORT, () => console.log(`Backend listening on :${PORT}`));
}

export { app, httpServer };
