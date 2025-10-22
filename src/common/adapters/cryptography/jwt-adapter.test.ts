import { describe, vi, test, beforeEach, expect } from 'vitest';

import jwt from 'jsonwebtoken';
import { JwtAdapter } from './jwt-adapter';

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('encoded_value'),
    verify: vi.fn().mockReturnValue({ decoded: 'any_value' }),
    decode: vi.fn().mockReturnValue({ decoded: 'any_value' }),
  },
}));

describe('JwtAdapter', () => {
  let sut: JwtAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    sut = new JwtAdapter();
  });

  describe('encode', async () => {
    test('Should call jwt.sign with correct values', () => {
      sut.encrypt({ field: 'any_value' });

      expect(jwt.sign).toHaveBeenCalledWith(
        { field: 'any_value' },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRE_IN!,
        } as jwt.SignOptions
      );
    });
    test('Should return encoded value on success', () => {
      const result = sut.encrypt({ field: 'any_value' });

      expect(result).toBe('encoded_value');
    });
    test('Should throw if jwt throws', () => {
      vi.mocked(jwt.sign).mockImplementationOnce(() => {
        throw new Error();
      });

      expect(() => sut.encrypt({ field: 'any_value' })).toThrow();
    });
  });

  describe('decode', async () => {
    test('Should call jwt.decode with correct value', () => {
      const decodeSpy = vi.spyOn(jwt, 'decode');
      sut.decode('any_token');

      expect(decodeSpy).toHaveBeenCalledWith('any_token');
    });

    test('Should return decoded value on success', () => {
      const result = sut.decode('any_token');
      expect(result).toBeDefined();
    });

    test('Should throw if jwt.decode throws', () => {
      vi.spyOn(jwt, 'decode').mockImplementationOnce(() => {
        throw new Error();
      });
      expect(() => sut.decode('any_token')).toThrow();
    });
  });

  describe('decode', async () => {
    test('Should call jwt.verify with correct value', () => {
      const verifySpy = vi.spyOn(jwt, 'verify');
      sut.decrypt('any_token');

      expect(verifySpy).toHaveBeenCalledWith(
        'any_token',
        process.env.JWT_SECRET
      );
    });

    test('Should return decoded value on success', () => {
      const result = sut.decrypt('any_token');
      expect(result).toBeDefined();
    });

    test('Should throw if jwt.verify throws', () => {
      vi.spyOn(jwt, 'verify').mockImplementationOnce(() => {
        throw new Error();
      });

      expect(() => sut.decrypt('any_token')).toThrow();
    });
  });
});
