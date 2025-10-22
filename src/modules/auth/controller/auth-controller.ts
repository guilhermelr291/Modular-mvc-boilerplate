import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../service/auth-service';
import { FieldComparer } from '../protocols/fields-comparer';
import { User } from '@prisma/client';
import { BadRequestError } from '../../../common/errors/http-errors';

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly fieldComparer: FieldComparer
  ) {
    this.authService = authService;
    this.fieldComparer = fieldComparer;
  }

  async signUp(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;

      this.fieldComparer.compare(data);

      await this.authService.signUp(data);

      res.status(201).json({ message: 'Usuário criado com sucesso!' });
    } catch (error) {
      console.log('Erro no signup: ', error);
      next(error);
    }
  }

  async login(
    req: Request,
    res: Response<{ accessToken: string; refreshToken: string; user: User }>,
    next: NextFunction
  ) {
    try {
      const userAndToken = await this.authService.login(req.body);

      res.status(200).json(userAndToken);
    } catch (error) {
      console.log('Erro no login: ', error);
      next(error);
    }
  }

  async refreshAccessToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new BadRequestError('Refresh token not provided');
      }

      const tokens = await this.authService.refreshAccessToken(refreshToken);

      res.status(200).json(tokens);
    } catch (error) {
      console.error('Error while refreshing access token: ', error);
      next(error);
    }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      await this.authService.requestPasswordReset(email);

      res
        .status(200)
        .json({ message: 'Email de recuperação enviado com sucesso!' });
    } catch (error) {
      console.log('Erro ao solicitar recuperação de senha: ', error);
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;

      await this.authService.resetPassword(token, newPassword);

      res.status(200).json({ message: 'Senha alterada com sucesso!' });
    } catch (error) {
      console.log('Erro ao resetar senha: ', error);
      next(error);
    }
  }
}
