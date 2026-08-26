import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import config from '../../config/env.config.js';
import authRepository from './auth.repository.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../shared/errors/AppError.js';

class AuthService {
  constructor(repository) {
    this.repository = repository;
  }

  async hashPassword(plainText) {
    return bcrypt.hash(plainText, config.bcrypt.saltRounds);
  }

  async comparePasswords(plainText, hash) {
    return bcrypt.compare(plainText, hash);
  }

  signAccessToken(payload) {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiresIn,
    });
  }

  signRefreshToken(payload) {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });
  }

  verifyToken(token) {
    return jwt.verify(token, config.jwt.secret);
  }

  buildTokens(user) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: this.signAccessToken(payload),
      refreshToken: this.signRefreshToken(payload),
      expiresIn: this.parseExpiresIn(config.jwt.accessExpiresIn),
    };
  }

  parseExpiresIn(input) {
    if (typeof input === 'number') return input;
    const match = `${input}`.match(/^(\d+)([smhd])$/i);
    if (!match) return 900;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const mul = { s: 1, m: 60, h: 3600, d: 86400 }[unit] || 1;
    return value * mul;
  }

  sanitizeUser(user) {
    const { passwordHash, refreshToken, ...rest } = user;
    return rest;
  }

  async register(input) {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists.');
    }

    const passwordHash = await this.hashPassword(input.password);

    const user = await this.repository.createUser({
      firstName: input.firstName,
      lastName: input.lastName,
      className: input.className,
      email: input.email,
      passwordHash,
      role: 'STUDENT',
      plan: input.plan || 'FREE',
    });

    const tokens = this.buildTokens(user);
    await this.repository.setRefreshToken(user.id, tokens.refreshToken);
    await this.repository.updateLastLogin(user.id);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async login(input) {
    const user = await this.repository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const match = await this.comparePasswords(input.password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const tokens = this.buildTokens(user);
    await this.repository.setRefreshToken(user.id, tokens.refreshToken);
    await this.repository.updateLastLogin(user.id);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async me(userId) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    return user;
  }

  async refresh(token) {
    let payload;
    try {
      payload = this.verifyToken(token);
    } catch (_) {
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }
    const user = await this.repository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedError('User no longer exists.');
    }
    const tokens = this.buildTokens(user);
    await this.repository.setRefreshToken(user.id, tokens.refreshToken);
    return { user, tokens };
  }

  async logout(userId) {
    try {
      await this.repository.setRefreshToken(userId, null);
    } catch (_) {}
    return true;
  }
}

export default new AuthService(authRepository);
