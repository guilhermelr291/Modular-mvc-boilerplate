import { v4 as uuidv4 } from 'uuid';
import { RefreshTokenGenerator } from '../../modules/auth/protocols/refresh-token-generator';

export class RefreshTokenGeneratorImpl implements RefreshTokenGenerator {
  generate(): string {
    return uuidv4();
  }
}
