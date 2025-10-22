import jwt from 'jsonwebtoken';
import { Encrypter } from '../../../modules/auth/protocols/encrypter';
import { Decrypter } from '../../../modules/auth/protocols/decrypter';
import { Decoder } from '../../../modules/auth/protocols/decoder';

export class JwtAdapter implements Encrypter, Decrypter, Decoder {
  private readonly SECRET: string;
  constructor() {
    this.SECRET = process.env.JWT_SECRET!;
  }

  encrypt(data: {}, expiresIn?: string, secret?: string): string {
    const options: any = expiresIn
      ? { expiresIn }
      : { expiresIn: process.env.JWT_EXPIRE_IN! };

    return jwt.sign(data, secret || this.SECRET, options);
  }

  decrypt(token: string, secret?: string) {
    return jwt.verify(token, secret || this.SECRET);
  }

  decode(token: string) {
    return jwt.decode(token);
  }
}
