export interface Decrypter {
  decrypt(token: string, secret?: string): any;
}
