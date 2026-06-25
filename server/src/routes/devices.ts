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

devicesRouter.post(
  '/:ip/seek',
  handler(async (req, res) => {
    const position = Number((req.body as { position?: unknown }).position);
    if (!Number.isFinite(position) || position < 0) {
      res.status(400).json({ error: 'position doit être un nombre de secondes >= 0' });
      return;
    }
    await sonos.seek(ip(req), Math.round(position));
    res.json({ ok: true });
  }),
);

// Rejoindre le groupe d'un coordinateur (multiroom).
devicesRouter.post(
  '/:ip/join',
  handler(async (req, res) => {
    const coordinatorUuid = (req.body as { coordinatorUuid?: unknown }).coordinatorUuid;
    if (typeof coordinatorUuid !== 'string' || coordinatorUuid.length === 0) {
      res.status(400).json({ error: 'coordinatorUuid (string) est requis' });
      return;
    }
    await sonos.joinGroup(ip(req), coordinatorUuid);
    res.json({ ok: true });
  }),
);

// Quitter son groupe (devenir autonome).
devicesRouter.post(
  '/:ip/ungroup',
  handler(async (req, res) => {
    await sonos.ungroup(ip(req));
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

// --- File d'attente ---

devicesRouter.get(
  '/:ip/queue',
  handler(async (req, res) => {
    res.json(await sonos.getQueue(ip(req)));
  }),
);

devicesRouter.post(
  '/:ip/queue/play',
  handler(async (req, res) => {
    const index = Number((req.body as { index?: unknown }).index);
    if (!Number.isInteger(index) || index < 0) {
      res.status(400).json({ error: 'index doit être un entier >= 0' });
      return;
    }
    await sonos.playQueueTrack(ip(req), index);
    res.json({ ok: true });
  }),
);

devicesRouter.post(
  '/:ip/queue/remove',
  handler(async (req, res) => {
    const objectId = (req.body as { objectId?: unknown }).objectId;
    if (typeof objectId !== 'string' || objectId.length === 0) {
      res.status(400).json({ error: 'objectId (string) est requis' });
      return;
    }
    await sonos.removeQueueTrack(ip(req), objectId);
    res.json({ ok: true });
  }),
);

devicesRouter.post(
  '/:ip/queue/reorder',
  handler(async (req, res) => {
    const body = req.body as { fromIndex?: unknown; toIndex?: unknown };
    const fromIndex = Number(body.fromIndex);
    const toIndex = Number(body.toIndex);
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex < 0 || toIndex < 0) {
      res.status(400).json({ error: 'fromIndex et toIndex doivent être des entiers >= 0' });
      return;
    }
    await sonos.reorderQueueTrack(ip(req), fromIndex, toIndex);
    res.json({ ok: true });
  }),
);

// --- Égaliseur ---

devicesRouter.get(
  '/:ip/eq',
  handler(async (req, res) => {
    res.json(await sonos.getEq(ip(req)));
  }),
);

devicesRouter.post(
  '/:ip/eq',
  handler(async (req, res) => {
    const body = req.body as { bass?: unknown; treble?: unknown; loudness?: unknown };
    const patch: { bass?: number; treble?: number; loudness?: boolean } = {};

    if (body.bass !== undefined) {
      const bass = Number(body.bass);
      if (!Number.isFinite(bass) || bass < -10 || bass > 10) {
        res.status(400).json({ error: 'bass doit être un nombre entre -10 et 10' });
        return;
      }
      patch.bass = Math.round(bass);
    }
    if (body.treble !== undefined) {
      const treble = Number(body.treble);
      if (!Number.isFinite(treble) || treble < -10 || treble > 10) {
        res.status(400).json({ error: 'treble doit être un nombre entre -10 et 10' });
        return;
      }
      patch.treble = Math.round(treble);
    }
    if (body.loudness !== undefined) {
      if (typeof body.loudness !== 'boolean') {
        res.status(400).json({ error: 'loudness doit être un booléen' });
        return;
      }
      patch.loudness = body.loudness;
    }

    await sonos.setEq(ip(req), patch);
    res.json({ ok: true });
  }),
);

// --- Volume de groupe (mode soirée) ---

devicesRouter.get(
  '/:ip/group-volume',
  handler(async (req, res) => {
    res.json({ volume: await sonos.getGroupVolume(ip(req)) });
  }),
);

devicesRouter.post(
  '/:ip/group-volume',
  handler(async (req, res) => {
    const volume = Number((req.body as { volume?: unknown }).volume);
    if (!Number.isFinite(volume) || volume < 0 || volume > 100) {
      res.status(400).json({ error: 'volume doit être un nombre entre 0 et 100' });
      return;
    }
    await sonos.setGroupVolume(ip(req), Math.round(volume));
    res.json({ ok: true });
  }),
);

// Lance une playlist / un favori.
devicesRouter.post(
  '/:ip/play-playlist',
  handler(async (req, res) => {
    const body = req.body as { uri?: unknown; replaceQueue?: unknown; metadata?: unknown };
    if (typeof body.uri !== 'string' || body.uri.length === 0) {
      res.status(400).json({ error: 'uri (string) est requis' });
      return;
    }
    const replaceQueue = body.replaceQueue === undefined ? true : Boolean(body.replaceQueue);
    const metadata = typeof body.metadata === 'string' ? body.metadata : '';
    await sonos.playPlaylist(ip(req), body.uri, replaceQueue, metadata);
    res.json({ ok: true });
  }),
);
