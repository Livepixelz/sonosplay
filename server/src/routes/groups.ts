import { Router, type NextFunction, type Request, type Response } from 'express';
import * as sonos from '../sonos.js';

export const groupsRouter = Router();

groupsRouter.get(
  '/',
  (_req: Request, res: Response, next: NextFunction) => {
    sonos
      .getGroups()
      .then((groups) => res.json(groups))
      .catch(next);
  },
);
