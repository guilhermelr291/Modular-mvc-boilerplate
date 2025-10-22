import { beforeEach, describe, expect, test, vi } from 'vitest';
import bcrypt from 'bcrypt';
import { BcryptAdapter } from './bcrypt-adapter';
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_value'),
    genSalt: vi.fn().mockResolvedValue('any_salt'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

describe('BcryptAdapter', () => {
  let sut: BcryptAdapter;
  beforeEach(() => {
    vi.clearAllMocks();

    sut = new BcryptAdapter(12);
  });

  describe('hash', () => {
    test('Should call bcrypt hash method with correct value', async () => {
      await sut.hash('any_value');

      expect(bcrypt.hash).toHaveBeenCalledWith('any_value', 'any_salt');
    });

    test('Should throw if bcrypt throws', () => {
      vi.mocked(bcrypt.hash).mockImplementationOnce(() => {
        throw new Error();
      });

      expect(sut.hash('any_value')).rejects.toThrow();
    });
    test('Should return hashed value', async () => {
      const result = await sut.hash('any_value');

      expect(result).toBe('hashed_value');
    });
  });

  describe('compare', () => {
    test('Should call bcrypt compare method with correct values', async () => {
      const compareSpy = vi.spyOn(bcrypt, 'compare');
      await sut.compare('any_value', 'any_value_to_compare');
      expect(compareSpy).toHaveBeenCalledWith(
        'any_value',
        'any_value_to_compare'
      );
    });
    test('Should return true when values match', async () => {
      const result = await sut.compare('any_value', 'any_value');

      expect(result).toBe(true);
    });

    test('Should throw if bcrypt compare throws', async () => {
      vi.mocked(bcrypt.compare).mockImplementationOnce(() => {
        throw new Error();
      });
      expect(
        async () => await sut.compare('any_value', 'any_value')
      ).rejects.toThrow();
    });
  });
});
