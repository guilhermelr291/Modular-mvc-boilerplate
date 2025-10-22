import { beforeEach, describe, expect, test, vi } from 'vitest';
import { UserRepository } from '../../user/repository/user-repository';
import { BcryptAdapter } from '../../../common/adapters/cryptography/bcrypt-adapter';

import { AuthService, LoginParams, SignUpParams } from './auth-service';
import { User } from '@prisma/client';
import { JwtAdapter } from '../../../common/adapters/cryptography/jwt-adapter';
import { UnauthorizedError } from '../../../common/errors/http-errors';
import { Hasher } from '../protocols/hasher';
import { HashComparer } from '../protocols/hash-comparer';
import { Encrypter } from '../protocols/encrypter';
import { RefreshTokenGenerator } from '../protocols/refresh-token-generator';

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

const mockUserModel = (): User => ({
  id: 1,
  email: 'any_email',
  password: 'any_password',
  name: 'any_name',
});

const mockUserRepository = {
  getByEmail: vi.fn(),
  create: vi.fn(),
  saveRefreshToken: vi.fn(),
  getRefreshTokenWithUser: vi.fn(),
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
    return 'encoded_value';
  }
}

class RefreshTokenGeneratorStub implements RefreshTokenGenerator {
  generate(): string {
    return 'another_encoded_value';
  }
}

describe('AuthService', () => {
  let sut: AuthService;
  let hashComparerStub: HashComparer;
  let hasherStub: Hasher;
  let encrypterStub: Encrypter;
  let refreshTokenGeneratorStub = new RefreshTokenGeneratorStub();

  beforeEach(() => {
    vi.clearAllMocks();

    hashComparerStub = new HashComparerStub();
    encrypterStub = new EncrypterStub();
    hasherStub = new HasherStub();

    sut = new AuthService(
      mockUserRepository,
      hasherStub,
      hashComparerStub,
      encrypterStub,
      refreshTokenGeneratorStub
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

    test('Should return accessToken, refreshToken and user on success', async () => {
      const result = await sut.login(mockLoginParams());

      expect(result).toStrictEqual({
        accessToken: 'encoded_value',
        refreshToken: 'another_encoded_value',
        user: {
          id: 1,
          email: 'any_email',
          name: 'any_name',
        },
      });
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
});
