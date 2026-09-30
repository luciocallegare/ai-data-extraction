import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import argon2 from 'argon2';
import { User } from '../models/User.js';
import { config } from '../config.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function setAuthCookie(reply: any, token: string) {
  reply.setCookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    const { email, password } = registerSchema.parse(request.body);
    const normalizedEmail = email.toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return reply.code(409).send({ error: 'Email already registered' });
    }
    const passwordHash = await argon2.hash(password);
    const user = await User.create({ email: normalizedEmail, passwordHash });
    const token = app.jwt.sign({ sub: user._id.toString() });
    setAuthCookie(reply, token);
    return reply.code(201).send({ id: user._id.toString(), email: user.email });
  });

  app.post('/auth/login', async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    const token = app.jwt.sign({ sub: user._id.toString() });
    setAuthCookie(reply, token);
    return { id: user._id.toString(), email: user.email };
  });

  app.post('/auth/logout', async (_request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { ok: true };
  });
}
