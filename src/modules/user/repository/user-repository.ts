import { User } from '@prisma/client';
import prisma from '../../../../prisma/db';
import { SignUpParams } from '../../auth/service/auth-service';

export class UserRepository {
  async getByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user;
  }

  async create(data: SignUpParams): Promise<User> {
    const { confirmPassword, ...dataToBd } = data;
    const user = await prisma.user.create({ data: dataToBd });
    return user;
  }

  async saveRefreshToken(refreshToken: string, userId: number) {
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        expiresAt: new Date(Date.now() + Number(process.env.REFRESH_EXPIRES!)),
        userId,
      },
    });
  }

  async getRefreshTokenWithUser(token: string) {
    return await prisma.refreshToken.findUnique({
      where: {
        token,
      },
      include: {
        user: true,
      },
    });
  }

  async deleteRefreshToken(id: number) {
    return await prisma.refreshToken.delete({
      where: { id },
    });
  }

  async revokeAllUserRefreshTokens(userId: number) {
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }
}
