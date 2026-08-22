import type { NextFunction, Request, Response } from 'express';
import { findUserById } from '../services/users.js';
import type { PublicUser } from '../types/index.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      currentUser?: PublicUser;
    }
  }
}

/**
 * Loads the current user (if any) onto res.locals.currentUser, and destroys
 * the session immediately if the account has been deactivated — so a
 * deactivation takes effect on the very next request, not just future logins.
 */
export async function attachUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.session.userId;
  if (!userId) {
    next();
    return;
  }

  const user = await findUserById(userId);
  if (!user || !user.is_active) {
    req.session.destroy(() => {
      next();
    });
    return;
  }

  const { password_hash: _passwordHash, ...publicUser } = user;
  res.locals.currentUser = publicUser;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!res.locals.currentUser) {
    res.redirect('/login');
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!res.locals.currentUser) {
    res.redirect('/login');
    return;
  }
  if (res.locals.currentUser.role !== 'admin') {
    res.status(404).send('Not found');
    return;
  }
  next();
}

export function redirectIfAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (res.locals.currentUser) {
    res.redirect('/');
    return;
  }
  next();
}
