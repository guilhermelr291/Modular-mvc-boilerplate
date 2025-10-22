import { beforeEach, describe, expect, test, vi } from 'vitest';
import { UserRepository } from './user-repository';
import prisma from '../../../../prisma/db';
import { SignUpParams } from '../../auth/service/auth-service';
import { User } from '@prisma/client';

vi.mock('../../../../prisma/db', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

const mockUser = (): User => ({
  id: 1,
  email: 'any_email',
  name: 'any_name',
  password: 'any_password',
});

const mockSighUpParams = (): SignUpParams => ({
  email: 'any_email',
  name: 'any_name',
  password: 'any_password',
  confirmPassword: 'any_password',
});

const mockRefreshToken = () => ({
  id: 1,
  token: 'any_refresh_token',
  expiresAt: new Date(),
  userId: 1,
  revoked: false,
  createdAt: new Date(),
});

const mockRefreshTokenWithUser = () => ({
  ...mockRefreshToken(),
  user: mockUser(),
});

describe('UserRepository', () => {
  let sut: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    sut = new UserRepository();
  });

  describe('getByEmail', () => {
    test('Should call prisma findUnique with correct value', async () => {
      await sut.getByEmail('any_email');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'any_email' },
      });
    });

    test('Should return user if it is found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser());

      const result = await sut.getByEmail('any_email');

      expect(result).toStrictEqual(mockUser());
    });

    test('Should return null if user does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      const result = await sut.getByEmail('any_email');

      expect(result).toBeNull();
    });

    test('Should throw if prisma throws', async () => {
      vi.mocked(prisma.user.findUnique).mockImplementationOnce(() => {
        throw new Error();
      });

      expect(sut.getByEmail('any_email')).rejects.toThrow();
    });
  });

  describe('create', () => {
    test('Should call prisma created method with correct data', async () => {
      await sut.create(mockSighUpParams());

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'any_email',
          name: 'any_name',
          password: 'any_password',
        },
      });
    });

    test('Should return user returned by prisma created method', async () => {
      vi.mocked(prisma.user.create).mockResolvedValueOnce(mockUser());

      const result = await sut.create(mockSighUpParams());

      expect(result).toStrictEqual(mockUser());
    });

    test('Should throw if prisma throws', async () => {
      vi.mocked(prisma.user.create).mockImplementationOnce(() => {
        throw new Error();
      });

      expect(sut.create(mockSighUpParams())).rejects.toThrow();
    });
  });

  describe('getById', () => {
    test('Should call prisma findUnique with correct value', async () => {
      await sut.getById(1);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    test('Should return user if it is found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser());

      const result = await sut.getById(1);

      expect(result).toStrictEqual(mockUser());
    });

    test('Should return null if user does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const result = await sut.getById(1);

      expect(result).toBeNull();
    });

    test('Should throw if prisma throws', async () => {
      vi.mocked(prisma.user.findUnique).mockImplementationOnce(() => {
        throw new Error();
      });

      expect(sut.getById(1)).rejects.toThrow();
    });
  });

  describe('update', () => {
    test('Should call prisma update with correct values', async () => {
      const updateData = { name: 'new_name', email: 'new_email' };

      await sut.update(1, updateData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateData,
      });
    });

    test('Should return updated user', async () => {
      const updatedUser = { ...mockUser(), name: 'new_name' };
      vi.mocked(prisma.user.update).mockResolvedValueOnce(updatedUser);

      const result = await sut.update(1, { name: 'new_name' });

      expect(result).toStrictEqual(updatedUser);
    });

    test('Should throw if prisma throws', async () => {
      vi.mocked(prisma.user.update).mockImplementationOnce(() => {
        throw new Error();
      });

      expect(sut.update(1, { name: 'new_name' })).rejects.toThrow();
    });
  });

  describe('saveRefreshToken', () => {
    test('Should call prisma create with correct values', async () => {
      const refreshToken = 'any_refresh_token';
      const userId = 1;

      await sut.saveRefreshToken(refreshToken, userId);

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: refreshToken,
          expiresAt: expect.any(Date),
          userId,
        },
      });
    });

    test('Should throw if prisma throws', async () => {
      vi.mocked(prisma.refreshToken.create).mockImplementationOnce(() => {
        throw new Error();
      });

      expect(sut.saveRefreshToken('any_token', 1)).rejects.toThrow();
    });
  });

  describe('getRefreshTokenWithUser', () => {
    test('Should call prisma findUnique with correct value and include user', async () => {
      const token = 'any_refresh_token';

      await sut.getRefreshTokenWithUser(token);

      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token },
        include: { user: true },
      });
    });

    test('Should return refresh token with user if found', async () => {
      const tokenWithUser = mockRefreshTokenWithUser();
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValueOnce(
        tokenWithUser
      );

      const result = await sut.getRefreshTokenWithUser('any_refresh_token');

      expect(result).toStrictEqual(tokenWithUser);
    });

    test('Should return null if token does not exist', async () => {
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValueOnce(null);

      const result = await sut.getRefreshTokenWithUser('invalid_token');

      expect(result).toBeNull();
    });

    test('Should throw if prisma throws', async () => {
      vi.mocked(prisma.refreshToken.findUnique).mockImplementationOnce(() => {
        throw new Error();
      });

      expect(sut.getRefreshTokenWithUser('any_token')).rejects.toThrow();
    });
  });

  describe('deleteRefreshToken', () => {
    test('Should call prisma delete with correct value', async () => {
      const tokenId = 1;

      await sut.deleteRefreshToken(tokenId);

      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: tokenId },
      });
    });

    test('Should return deleted refresh token', async () => {
      const deletedToken = mockRefreshToken();
      vi.mocked(prisma.refreshToken.delete).mockResolvedValueOnce(deletedToken);

      const result = await sut.deleteRefreshToken(1);

      expect(result).toStrictEqual(deletedToken);
    });

    test('Should throw if prisma throws', async () => {
      vi.mocked(prisma.refreshToken.delete).mockImplementationOnce(() => {
        throw new Error();
      });

      expect(sut.deleteRefreshToken(1)).rejects.toThrow();
    });
  });

  describe('revokeAllUserRefreshTokens', () => {
    test('Should call prisma updateMany with correct values', async () => {
      const userId = 1;

      await sut.revokeAllUserRefreshTokens(userId);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
    });

    test('Should throw if prisma throws', async () => {
      vi.mocked(prisma.refreshToken.updateMany).mockImplementationOnce(() => {
        throw new Error();
      });

      expect(sut.revokeAllUserRefreshTokens(1)).rejects.toThrow();
    });
  });
});
