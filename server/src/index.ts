import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { devicesRouter } from './routes/devices.js';

const PORT = Number(process.env.PORT ?? 3000);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/devices', devicesRouter);

// Gestion d'erreur centralisée : une enceinte injoignable renvoie 502
// pour que le frontend la bascule en "offline".
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: number }).status) || 502
      : 502;
  const message = err instanceof Error ? err.message : 'Erreur inconnue';
  if (status >= 500) {
    console.error('[sonosplay]', message);
  }
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`[sonosplay] backend prêt sur http://localhost:${PORT}`);
});
