import jwt from 'jsonwebtoken';
import { Encrypter } from '../../../modules/auth/protocols/encrypter';
import dotenv from 'dotenv';

dotenv.config();
export class JwtAdapter implements Encrypter {
  private readonly SECRET: jwt.Secret;
  constructor() {
    this.SECRET = process.env.JWT_SECRET! as jwt.Secret;
  }

  encrypt(data: {}): string {
    return jwt.sign(data, this.SECRET, {
      expiresIn: process.env.JWT_EXPIRE_IN!,
    } as jwt.SignOptions);
  }
}
