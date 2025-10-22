export interface Encrypter {
  encrypt(data: {}, expiresIn?: string, secret?: string): string;
}
