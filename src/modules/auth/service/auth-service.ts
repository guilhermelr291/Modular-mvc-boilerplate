import {
  BadRequestError,
  UnauthorizedError,
} from '../../../common/errors/http-errors';
import { UserRepository } from '../../user/repository/user-repository';

import { Hasher } from '../protocols/hasher';
import { HashComparer } from '../protocols/hash-comparer';
import { Encrypter } from '../protocols/encrypter';
import { RefreshTokenGenerator } from '../protocols/refresh-token-generator';
import { User } from '@prisma/client';

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
    private readonly refreshTokenGenerator: RefreshTokenGenerator
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
}
