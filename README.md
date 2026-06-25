# SonosPlay

Petite application web pour contrôler ses enceintes **Sonos** sur le réseau local,
via leur API UPnP non authentifiée (port `1400`).

> ⚠️ **Usage strictement personnel et domestique** : tes propres enceintes, ton
> propre LAN. L'API Sonos sur le port 1400 n'est pas authentifiée, ce projet
> suppose un réseau de confiance.

## Architecture

```
sonosplay/
├── server/   # Proxy Node + Express, wrappe @svrooij/sonos (sonos-ts)
└── web/      # Frontend Vue 3 + Vite + Pinia + TanStack Query + Reka UI
```

Le navigateur ne peut pas envoyer les requêtes SOAP vers le port 1400
(CORS + headers). Le **backend Node** fait ce travail et expose une API REST
simple ; le **frontend** ne parle qu'à ce backend.

## Prérequis

- Node.js ≥ 20
- Être sur le **même réseau local** que les enceintes Sonos.

## Installation

```bash
npm install
```

(Le projet utilise les **npm workspaces** : une seule install à la racine
installe le backend et le frontend.)

## Lancer

Deux terminaux :

```bash
# Terminal 1 — backend (http://localhost:3000)
npm run dev:server

# Terminal 2 — frontend (http://localhost:5173)
npm run dev:web
```

Ouvre ensuite http://localhost:5173. Le front proxifie automatiquement
`/api/*` vers le backend (voir `web/vite.config.ts`).

Variables d'environnement optionnelles :

- `PORT` (backend) : port d'écoute du backend, défaut `3000`.
- `BACKEND_URL` (front, dev) : cible du proxy Vite, défaut `http://localhost:3000`.

## API REST (backend)

| Méthode | Endpoint                         | Description                                            |
| ------- | -------------------------------- | ------------------------------------------------------ |
| GET     | `/api/devices`                   | Découverte SSDP des Sonos du household                 |
| GET     | `/api/devices/:ip/state`         | `{ name, volume, mute, transportState, currentTrack }` |
| POST    | `/api/devices/:ip/play`          | Lecture                                                |
| POST    | `/api/devices/:ip/pause`         | Pause                                                  |
| POST    | `/api/devices/:ip/next`          | Piste suivante                                         |
| POST    | `/api/devices/:ip/previous`      | Piste précédente                                       |
| POST    | `/api/devices/:ip/volume`        | body `{ volume: 0..100 }`                              |
| POST    | `/api/devices/:ip/mute`          | body `{ mute: boolean }`                               |
| GET     | `/api/devices/:ip/playlists`     | Playlists Sonos sauvegardées (`SQ:`)                   |
| GET     | `/api/devices/:ip/favorites`     | Favoris Sonos (`FV:2`)                                 |
| POST    | `/api/devices/:ip/play-playlist` | body `{ uri: string, replaceQueue?: boolean }`         |

L'IP est validée par une regex IPv4 avant chaque appel ciblant une enceinte.

## Playlists & favoris

L'app liste les **playlists Sonos** sauvegardées et les **favoris**, et permet
de les lancer (par défaut, en remplaçant la file d'attente). En interne :
`AddUriToQueue(uri)` → `SetAVTransportURI(x-rincon-queue:<uuid>#0)` → `Play()`.

## Trouver l'IP d'une enceinte

Plusieurs options :

1. **Découverte automatique** : le bouton « Rafraîchir » de l'app (ou
   `GET /api/devices`) fait une découverte SSDP et liste les enceintes avec
   leur IP — rien à faire à la main.
2. **Page de statut de l'enceinte** : si tu connais déjà une IP, ouvre
   `http://<ip-enceinte>:1400/status/topology` dans un navigateur : la page
   liste tous les ZonePlayers du household avec leurs IP et noms de pièce.
3. **Ton routeur** : la liste des baux DHCP affiche les appareils « Sonos ».

## Qualité / notes techniques

- TypeScript strict des deux côtés, pas de `any`.
- Une enceinte injoignable renvoie une erreur 502 côté backend et bascule en
  état **« Hors ligne »** dans l'UI (pas de crash).
- Le state de chaque enceinte est rafraîchi toutes les 2 s (TanStack Query) ;
  le slider de volume est *debounced* (~200 ms).
- `@svrooij/sonos` (sonos-ts) gère le SOAP/UPnP et la découverte SSDP.
