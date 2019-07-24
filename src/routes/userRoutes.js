import { Router } from 'express';
import { ensureAuth } from '../utils/socialAuth';

const routes = Router();

routes.get('/', (req, res) => {
  res.json({ message: 'User routes backend' });
});

routes.get('/curr', ensureAuth, (req, res, next) => {
  res.json({ user: req.user });
});

export default routes;
