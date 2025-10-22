import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../../../common/errors/http-errors';
import { UserRepository } from '../../user/repository/user-repository';

import { Hasher } from '../protocols/hasher';
import { HashComparer } from '../protocols/hash-comparer';
import { Encrypter } from '../protocols/encrypter';
import { RefreshTokenGenerator } from '../protocols/refresh-token-generator';
import { User } from '@prisma/client';
import { Decoder } from '../protocols/decoder';
import { Decrypter } from '../protocols/decrypter';

export type SignUpParams = {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
};

export type LoginParams = {
  email: string;
  password: string;
};

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hasher: Hasher,
    private readonly hashComparer: HashComparer,
    private readonly encrypter: Encrypter,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly decoder: Decoder,
    private readonly decrypter: Decrypter
  ) {}

  async signUp(data: SignUpParams): Promise<User> {
    const { email, password } = data;
    const user = await this.userRepository.getByEmail(email);
    if (user) throw new BadRequestError('Email is already in use');

    const hashedPassword = await this.hasher.hash(password);

    const createdUser = await this.userRepository.create({
      ...data,
      password: hashedPassword,
    });

    return createdUser;
  }

  async login(
    data: LoginParams
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const { email, password } = data;
    const user = await this.userRepository.getByEmail(email);
    if (!user) throw new UnauthorizedError();

    const passwordMatches = await this.hashComparer.compare(
      password,
      user.password
    );

    if (!passwordMatches) throw new UnauthorizedError();

    const accessToken = this.encrypter.encrypt({ id: user.id });

    const refreshToken = this.refreshTokenGenerator.generate();

    await this.userRepository.saveRefreshToken(refreshToken, user.id);

    const { password: pass, ...userToReturn } = user;

    return { accessToken, refreshToken, user: userToReturn };
  }

  async refreshAccessToken(
    token: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const storedToken = await this.userRepository.getRefreshTokenWithUser(
      token
    );

    if (!storedToken || storedToken.revoked) throw new UnauthorizedError();

    if (storedToken.expiresAt < new Date()) {
      await this.userRepository.deleteRefreshToken(storedToken.id);
      throw new UnauthorizedError();
    }

    await this.userRepository.revokeAllUserRefreshTokens(storedToken.user.id);

    const accessToken = this.encrypter.encrypt({
      id: storedToken.user.id,
    });

    const refreshToken = this.refreshTokenGenerator.generate();

    return { accessToken, refreshToken };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.getByEmail(email);
    if (!user) throw new NotFoundError('User not found');

    const secret = process.env.JWT_SECRET + user.password;
    const payload = { email: user.email, id: user.id };
    const token = this.encrypter.encrypt(
      payload,
      process.env.RESET_PASSWORD_JWT_EXPIRE_IN,
      secret
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    console.log('Reset link: ', resetLink);

    // mandar por email agora.
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const decoded: any = this.decoder.decode(token);
    if (!decoded?.id) throw new UnauthorizedError('Invalid token');

    const user = await this.userRepository.getById(decoded.id);

    if (!user) throw new NotFoundError('User not found');

    const secret = process.env.JWT_SECRET + user.password;

    try {
      this.decrypter.decrypt(token, secret);
    } catch (err) {
      throw new UnauthorizedError('Invalid token');
    }

    const hashedPassword = await this.hasher.hash(newPassword);

    await this.userRepository.update(user.id, { password: hashedPassword });
  }
}
