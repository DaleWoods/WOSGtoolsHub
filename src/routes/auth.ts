import { Router } from 'express';
import { redirectIfAuthenticated } from '../middleware/auth.js';
import { loginRateLimiter } from '../middleware/rateLimit.js';
import { findUserByUsername, recordLogin, verifyPassword } from '../services/users.js';
import { logSecurityEvent } from '../services/securityLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authRouter = Router();

authRouter.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('login', { error: null });
});

authRouter.post(
  '/login',
  redirectIfAuthenticated,
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const genericError = 'Invalid username or password.';
    const ip = req.ip ?? null;

    if (!username || !password) {
      res.status(400).render('login', { error: genericError });
      return;
    }

    const user = await findUserByUsername(username);
    const valid = user && user.is_active ? await verifyPassword(user, password) : false;

    if (!user || !valid) {
      await logSecurityEvent('login_failure', null, username, ip);
      res.status(401).render('login', { error: genericError });
      return;
    }

    await recordLogin(user.id);
    await logSecurityEvent('login_success', user.id, username, ip);

    req.session.regenerate((err) => {
      if (err) throw err;
      req.session.userId = user.id;
      res.redirect('/');
    });
  }),
);

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});
