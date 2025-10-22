import { describe, vi, test, beforeEach, expect } from 'vitest';

import jwt from 'jsonwebtoken';
import { JwtAdapter } from './jwt-adapter';

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('encoded_value'),
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
});
