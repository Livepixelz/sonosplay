import { Router, type Request, type Response, type NextFunction } from 'express';
import { assertValidIp } from '../lib/validateIp.js';
import * as sonos from '../sonos.js';

export const devicesRouter = Router();

/** Wrapper async -> next(err) pour centraliser la gestion d'erreur. */
function handler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

/** Récupère et valide le paramètre :ip. */
function ip(req: Request): string {
  return assertValidIp(req.params.ip ?? '');
}

// Découverte SSDP du household.
devicesRouter.get(
  '/',
  handler(async (_req, res) => {
    res.json(await sonos.discoverDevices());
  }),
);

// État courant d'une enceinte.
devicesRouter.get(
  '/:ip/state',
  handler(async (req, res) => {
    res.json(await sonos.getDeviceState(ip(req)));
  }),
);

devicesRouter.post(
  '/:ip/play',
  handler(async (req, res) => {
    await sonos.play(ip(req));
    res.json({ ok: true });
  }),
);

devicesRouter.post(
  '/:ip/pause',
  handler(async (req, res) => {
    await sonos.pause(ip(req));
    res.json({ ok: true });
  }),
);

devicesRouter.post(
  '/:ip/next',
  handler(async (req, res) => {
    await sonos.next(ip(req));
    res.json({ ok: true });
  }),
);

devicesRouter.post(
  '/:ip/previous',
  handler(async (req, res) => {
    await sonos.previous(ip(req));
    res.json({ ok: true });
  }),
);

devicesRouter.post(
  '/:ip/volume',
  handler(async (req, res) => {
    const volume = Number((req.body as { volume?: unknown }).volume);
    if (!Number.isFinite(volume) || volume < 0 || volume > 100) {
      res.status(400).json({ error: 'volume doit être un nombre entre 0 et 100' });
      return;
    }
    await sonos.setVolume(ip(req), Math.round(volume));
    res.json({ ok: true });
  }),
);

devicesRouter.post(
  '/:ip/mute',
  handler(async (req, res) => {
    const mute = (req.body as { mute?: unknown }).mute;
    if (typeof mute !== 'boolean') {
      res.status(400).json({ error: 'mute doit être un booléen' });
      return;
    }
    await sonos.setMute(ip(req), mute);
    res.json({ ok: true });
  }),
);

// Playlists Sonos sauvegardées.
devicesRouter.get(
  '/:ip/playlists',
  handler(async (req, res) => {
    res.json(await sonos.getPlaylists(ip(req)));
  }),
);

// Favoris Sonos.
devicesRouter.get(
  '/:ip/favorites',
  handler(async (req, res) => {
    res.json(await sonos.getFavorites(ip(req)));
  }),
);

// Lance une playlist / un favori.
devicesRouter.post(
  '/:ip/play-playlist',
  handler(async (req, res) => {
    const body = req.body as { uri?: unknown; replaceQueue?: unknown };
    if (typeof body.uri !== 'string' || body.uri.length === 0) {
      res.status(400).json({ error: 'uri (string) est requis' });
      return;
    }
    const replaceQueue = body.replaceQueue === undefined ? true : Boolean(body.replaceQueue);
    await sonos.playPlaylist(ip(req), body.uri, replaceQueue);
    res.json({ ok: true });
  }),
);
