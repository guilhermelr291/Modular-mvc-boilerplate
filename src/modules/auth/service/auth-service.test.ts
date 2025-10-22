import { beforeEach, describe, expect, test, vi } from 'vitest';
import { UserRepository } from '../../user/repository/user-repository';

import { AuthService, LoginParams, SignUpParams } from './auth-service';
import { User } from '@prisma/client';

import {
  NotFoundError,
  UnauthorizedError,
} from '../../../common/errors/http-errors';
import { Hasher } from '../protocols/hasher';
import { HashComparer } from '../protocols/hash-comparer';
import { Encrypter } from '../protocols/encrypter';
import { RefreshTokenGenerator } from '../protocols/refresh-token-generator';
import { Decrypter } from '../protocols/decrypter';
import { Decoder } from '../protocols/decoder';

const mockSignUpParams = (): SignUpParams => ({
  email: 'any_email@mail.com',
  password: 'any_password',
  confirmPassword: 'any_password',
  name: 'any_name',
});
const mockLoginParams = (): LoginParams => ({
  email: 'any_email@mail.com',
  password: 'any_password',
});

const mockRefreshAccessTokenParams = 'refresh_token';

const mockRequestPasswordResetParams = 'any_email@mail.com';
const mockResetPasswordParams: [string, string] = [
  'reset_token',
  'new_password',
];

const mockUserModel = (): User => ({
  id: 1,
  email: 'any_email',
  password: 'any_password',
  name: 'any_name',
});

const mockUserRepository = {
  getByEmail: vi.fn(),
  getById: vi.fn().mockResolvedValue(mockUserModel()),
  update: vi.fn(),
  create: vi.fn(),
  saveRefreshToken: vi.fn(),
  getRefreshTokenWithUser: vi.fn().mockResolvedValue({
    id: 1,
    revoked: false,
    expiresAt: new Date('9999-12-31T23:59:59.999Z'),
    user: {
      id: 1,
    },
  }),
  deleteRefreshToken: vi.fn(),
  revokeAllUserRefreshTokens: vi.fn(),
} as unknown as UserRepository;

class HasherStub implements Hasher {
  hash(value: string): Promise<string> {
    return new Promise(resolve => resolve('hashed_password'));
  }
}

class HashComparerStub implements HashComparer {
  compare(value: string, valueToCompare: string): Promise<boolean> {
    return new Promise(resolve => resolve(true));
  }
}

class EncrypterStub implements Encrypter {
  encrypt(data: {}): string {
    return 'encrypted_value';
  }
}

class DecrypterStub implements Decrypter {
  decrypt(token: string, secret?: string) {
    return 'decrypted_value';
  }
}
class DecoderStub implements Decoder {
  decode(token: string) {
    return { id: 'decoded_id' };
  }
}

class RefreshTokenGeneratorStub implements RefreshTokenGenerator {
  generate(): string {
    return 'refresh_token';
  }
}

describe('AuthService', () => {
  let sut: AuthService;
  let hashComparerStub: HashComparer;
  let hasherStub: Hasher;
  let encrypterStub: Encrypter;
  let decrypterStub: Decrypter;
  let decoderStub: Decoder;
  let refreshTokenGeneratorStub = new RefreshTokenGeneratorStub();

  beforeEach(() => {
    vi.clearAllMocks();

    hashComparerStub = new HashComparerStub();
    encrypterStub = new EncrypterStub();
    hasherStub = new HasherStub();
    decoderStub = new DecoderStub();
    decrypterStub = new DecrypterStub();

    sut = new AuthService(
      mockUserRepository,
      hasherStub,
      hashComparerStub,
      encrypterStub,
      refreshTokenGeneratorStub,
      decoderStub,
      decrypterStub
    );
  });

  describe('signUp', () => {
    test('Should call UserRepository.getByEmail with correct value', async () => {
      const getByEmailSpy = vi.spyOn(mockUserRepository, 'getByEmail');

      await sut.signUp(mockSignUpParams());

      expect(getByEmailSpy).toHaveBeenCalledWith(mockSignUpParams().email);
    });
    test('ensure AuthService throws if UserRepository.getByEmail returns a user', async () => {
      vi.spyOn(mockUserRepository, 'getByEmail').mockResolvedValueOnce(
        mockUserModel()
      );

      expect(sut.signUp(mockSignUpParams())).rejects.toThrow();
    });
    test('Should call UserRepository.create with correct values', async () => {
      const createSpy = vi.spyOn(mockUserRepository, 'create');

      let signUpParams = mockSignUpParams();

      await sut.signUp(signUpParams);

      signUpParams.password = 'hashed_password';

      expect(createSpy).toHaveBeenCalledWith(signUpParams);
    });
    test('Should call hasher with correct value', async () => {
      const hashSpy = vi.spyOn(hasherStub, 'hash');

      const signUpParams = mockSignUpParams();

      await sut.signUp(signUpParams);

      expect(hashSpy).toHaveBeenCalledWith(signUpParams.password);
    });
    test('Should throw if UserRepository.getByEmail throws', async () => {
      vi.spyOn(mockUserRepository, 'getByEmail').mockImplementationOnce(() => {
        throw new Error();
      });

      expect(sut.signUp(mockSignUpParams())).rejects.toThrow();
    });
    test('Should throw if hasher throws', async () => {
      vi.spyOn(hasherStub, 'hash').mockImplementationOnce(() => {
        throw new Error();
      });

      expect(sut.signUp(mockSignUpParams())).rejects.toThrow();
    });

    test('Should throw if UserRepository.create throws', async () => {
      vi.spyOn(mockUserRepository, 'create').mockImplementationOnce(() => {
        throw new Error();
      });

      expect(sut.signUp(mockSignUpParams())).rejects.toThrow();
    });
  });

  describe('login', () => {
    beforeEach(() => {
      vi.spyOn(mockUserRepository, 'getByEmail').mockResolvedValueOnce(
        mockUserModel()
      );
    });

    test('Should call UserRepository.getByEmail with correct value', async () => {
      const getByEmailSpy = vi.spyOn(mockUserRepository, 'getByEmail');

      await sut.login(mockLoginParams());

      expect(getByEmailSpy).toHaveBeenCalledWith(mockLoginParams().email);
    });

    test('Should throw UnauthorizedError if userRepository.getByEmail returns null', async () => {
      vi.spyOn(mockUserRepository, 'getByEmail').mockResolvedValueOnce(null);

      expect(sut.login(mockLoginParams())).rejects.toThrow(UnauthorizedError);
    });

    test('Should call HashComparer with correct values', async () => {
      const compareSpy = vi.spyOn(hashComparerStub, 'compare');

      const loginParams = mockLoginParams();

      const userModel = mockUserModel();

      await sut.login(loginParams);

      expect(compareSpy).toHaveBeenCalledWith(
        loginParams.password,
        userModel.password
      );
    });

    test('Should throw UnauthorizedError if HashComparer returns false', async () => {
      vi.spyOn(hashComparerStub, 'compare').mockResolvedValueOnce(false);

      expect(sut.login(mockLoginParams())).rejects.toThrow(UnauthorizedError);
    });

    test('Should call Encrypter with correct value', async () => {
      const encodeSpy = vi.spyOn(encrypterStub, 'encrypt');

      await sut.login(mockLoginParams());

      expect(encodeSpy).toHaveBeenCalledWith({ id: mockUserModel().id });
    });

    test('Should call RefreshTokenGenerator', async () => {
      const refreshTokenGeneratorSpy = vi.spyOn(
        refreshTokenGeneratorStub,
        'generate'
      );

      await sut.login(mockLoginParams());

      expect(refreshTokenGeneratorSpy).toHaveBeenCalled();
    });

    test('Should throw if RefreshTokenGenerator throws', async () => {
      vi.spyOn(refreshTokenGeneratorStub, 'generate').mockImplementationOnce(
        () => {
          throw new Error();
        }
      );

      expect(sut.login(mockLoginParams())).rejects.toThrow();
    });

    test('Should return accessToken, refreshToken and user on success', async () => {
      const result = await sut.login(mockLoginParams());

      expect(result).toStrictEqual({
        accessToken: 'encrypted_value',
        refreshToken: 'refresh_token',
        user: {
          id: 1,
          email: 'any_email',
          name: 'any_name',
        },
      });
    });

    test('Should call userRepository.saveRefreshToken with correct values', async () => {
      const saveRefreshTokenSpy = vi.spyOn(
        mockUserRepository,
        'saveRefreshToken'
      );

      await sut.login(mockLoginParams());

      expect(saveRefreshTokenSpy).toHaveBeenCalledWith('refresh_token', 1);
    });

    test('Should throw if  userRepository.saveRefreshToken throws', async () => {
      vi.spyOn(mockUserRepository, 'saveRefreshToken').mockImplementationOnce(
        () => {
          throw new Error();
        }
      );

      expect(sut.login(mockLoginParams())).rejects.toThrow();
    });

    test('Should throw if HashComparer throws', async () => {
      vi.spyOn(hashComparerStub, 'compare').mockImplementationOnce(() => {
        throw new Error();
      });

      expect(sut.login(mockLoginParams())).rejects.toThrow();
    });
    test('Should throw if UserRepository throws', async () => {
      vi.spyOn(mockUserRepository, 'getByEmail').mockImplementationOnce(() => {
        throw new Error();
      });

      expect(sut.login(mockLoginParams())).rejects.toThrow();
    });
    test('Should throw if Encrypter throws', async () => {
      vi.spyOn(encrypterStub, 'encrypt').mockImplementationOnce(() => {
        throw new Error();
      });

      expect(sut.login(mockLoginParams())).rejects.toThrow();
    });
  });

  describe('refreshAccessToken', () => {
    test('Should call userRepository.getRefreshTokenWithUser with correct value', async () => {
      const getRefreshTokenWithUserSpy = vi.spyOn(
        mockUserRepository,
        'getRefreshTokenWithUser'
      );

      await sut.refreshAccessToken(mockRefreshAccessTokenParams);

      expect(getRefreshTokenWithUserSpy).toHaveBeenCalledWith(
        mockRefreshAccessTokenParams
      );
    });

    test('Should call userRepository.getRefreshTokenWithUser with correct value', async () => {
      const getRefreshTokenWithUserSpy = vi.spyOn(
        mockUserRepository,
        'getRefreshTokenWithUser'
      );

      await sut.refreshAccessToken(mockRefreshAccessTokenParams);

      expect(getRefreshTokenWithUserSpy).toHaveBeenCalledWith(
        mockRefreshAccessTokenParams
      );
    });

    test('Should throw UnauthorizedError if token is not found or revoked', async () => {
      vi.spyOn(
        mockUserRepository,
        'getRefreshTokenWithUser'
      ).mockResolvedValueOnce(null);

      await expect(
        sut.refreshAccessToken(mockRefreshAccessTokenParams)
      ).rejects.toThrow(UnauthorizedError);
    });

    test('Should throw UnauthorizedError if token is expired', async () => {
      vi.spyOn(
        mockUserRepository,
        'getRefreshTokenWithUser'
      ).mockResolvedValueOnce({
        id: 1,
        revoked: false,
        expiresAt: new Date('2000-01-01T00:00:00.000Z'),
        user: {
          id: 1,
        },
      });
      await expect(
        sut.refreshAccessToken(mockRefreshAccessTokenParams)
      ).rejects.toThrow(UnauthorizedError);
    });

    test('Should call userRepository.revokeAllUserRefreshTokens with correct value', async () => {
      const revokeAllUserRefreshTokensSpy = vi.spyOn(
        mockUserRepository,
        'revokeAllUserRefreshTokens'
      );
      await sut.refreshAccessToken(mockRefreshAccessTokenParams);

      expect(revokeAllUserRefreshTokensSpy).toHaveBeenCalledWith(1);
    });
    test('Should call Encrypter with correct value', async () => {
      const encryptSpy = vi.spyOn(encrypterStub, 'encrypt');

      await sut.refreshAccessToken(mockRefreshAccessTokenParams);
      expect(encryptSpy).toHaveBeenCalledWith({ id: 1 });
    });
    test('Should call RefreshTokenGenerator', async () => {
      const generateSpy = vi.spyOn(refreshTokenGeneratorStub, 'generate');

      await sut.refreshAccessToken(mockRefreshAccessTokenParams);
      expect(generateSpy).toHaveBeenCalled();
    });
    test('Should return accessToken and refreshToken on success', async () => {
      const result = await sut.refreshAccessToken(mockRefreshAccessTokenParams);
      expect(result).toEqual({
        accessToken: 'encrypted_value',
        refreshToken: 'refresh_token',
      });
    });
  });

  describe('requestPasswordReset', () => {
    test('Should call userRepository.getByEmail with correct value', async () => {
      const getByEmailSpy = vi.spyOn(mockUserRepository, 'getByEmail');

      await sut.requestPasswordReset(mockRequestPasswordResetParams);
      expect(getByEmailSpy).toHaveBeenCalledWith(
        mockRequestPasswordResetParams
      );
    });

    test('Should throw NotFoundError if user is not found', async () => {
      vi.spyOn(mockUserRepository, 'getByEmail').mockResolvedValueOnce(null);

      await expect(
        sut.requestPasswordReset(mockRequestPasswordResetParams)
      ).rejects.toThrow(NotFoundError);
    });

    test('Should call Encrypter with correct values', async () => {
      const encryptSpy = vi.spyOn(encrypterStub, 'encrypt');
      const user = mockUserModel();
      vi.spyOn(mockUserRepository, 'getByEmail').mockResolvedValueOnce(user);
      const secret = process.env.JWT_SECRET + user.password;

      await sut.requestPasswordReset(mockRequestPasswordResetParams);
      expect(encryptSpy).toHaveBeenCalledWith(
        { email: user.email, id: user.id },
        process.env.RESET_PASSWORD_JWT_EXPIRE_IN,
        secret
      );
    });

    test('Should throw if userRepository.getByEmail throws', async () => {
      vi.spyOn(mockUserRepository, 'getByEmail').mockImplementationOnce(() => {
        throw new Error();
      });

      await expect(
        sut.requestPasswordReset(mockRequestPasswordResetParams)
      ).rejects.toThrow();
    });

    test('Should throw if Encrypter throws', async () => {
      vi.spyOn(encrypterStub, 'encrypt').mockImplementationOnce(() => {
        throw new Error();
      });

      await expect(
        sut.requestPasswordReset(mockRequestPasswordResetParams)
      ).rejects.toThrow();
    });
  });

  describe('resetPassword', () => {
    test('Should call Decoder.decode with correct value', async () => {
      const decodeSpy = vi.spyOn(decoderStub, 'decode');
      await sut.resetPassword(...mockResetPasswordParams);
      expect(decodeSpy).toHaveBeenCalledWith(mockResetPasswordParams[0]);
    });

    test('Should call userRepository.getById with correct value', async () => {
      const getByIdSpy = vi.spyOn(mockUserRepository, 'getById');
      const decoded = decoderStub.decode(mockResetPasswordParams[0]);
      await sut.resetPassword(...mockResetPasswordParams);
      expect(getByIdSpy).toHaveBeenCalledWith(decoded.id);
    });

    test('Should throw NotFoundError if user is not found', async () => {
      vi.spyOn(mockUserRepository, 'getById').mockResolvedValueOnce(null);
      await expect(
        sut.resetPassword(...mockResetPasswordParams)
      ).rejects.toThrow(NotFoundError);
    });

    test('Should throw UnauthorizedError if Decoder.decode returns invalid data', async () => {
      vi.spyOn(decoderStub, 'decode').mockReturnValueOnce(null);
      await expect(
        sut.resetPassword(...mockResetPasswordParams)
      ).rejects.toThrow(UnauthorizedError);
    });

    test('Should call hasher.hash with correct value', async () => {
      const hashSpy = vi.spyOn(hasherStub, 'hash');
      await sut.resetPassword(...mockResetPasswordParams);
      expect(hashSpy).toHaveBeenCalledWith(mockResetPasswordParams[1]);
    });

    test('Should call userRepository.update with correct values', async () => {
      const updateSpy = vi.spyOn(mockUserRepository, 'update');
      const user = await mockUserRepository.getById(1);
      await sut.resetPassword(...mockResetPasswordParams);
      expect(updateSpy).toHaveBeenCalledWith(user?.id, {
        password: 'hashed_password',
      });
    });

    test('Should call Decrypter.decrypt with correct values', async () => {
      const decryptSpy = vi.spyOn(decrypterStub, 'decrypt');
      const user = await mockUserRepository.getById(1);
      const secret = process.env.JWT_SECRET! + user?.password;
      await sut.resetPassword(...mockResetPasswordParams);
      expect(decryptSpy).toHaveBeenCalledWith(
        mockResetPasswordParams[0],
        secret
      );
    });

    test('Should throw if userRepository.getById throws', async () => {
      vi.spyOn(mockUserRepository, 'getById').mockImplementationOnce(() => {
        throw new Error();
      });
      await expect(
        sut.resetPassword(...mockResetPasswordParams)
      ).rejects.toThrow();
    });
  });
});
