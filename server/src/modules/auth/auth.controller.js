import * as authService from './auth.service.js';

export async function register(req, res) {
  const result = await authService.registerUser(req.validated.body);
  res.status(201).json(result);
}

export async function login(req, res) {
  const result = await authService.loginUser(req.validated.body);
  res.json(result);
}

export async function demo(_req, res) {
  const result = await authService.createDemoSession();
  res.status(201).json(result);
}

export function me(req, res) {
  res.json({ user: req.user });
}
