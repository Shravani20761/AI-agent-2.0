import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return err(res, 'Email and password required');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return err(res, 'Invalid credentials', 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return err(res, 'Invalid credentials', 401);

  const token = signToken(user);
  ok(res, {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
  });
};

export const me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  });
  if (!user) return err(res, 'User not found', 404);
  ok(res, { user });
};
