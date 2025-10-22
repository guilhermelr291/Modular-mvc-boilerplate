import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/refresh',
];

export async function checkAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (PUBLIC_ROUTES.includes(req.path)) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res
        .status(401)
        .json({ message: 'Token não fornecido ou formato inválido' });
      return;
    }

    const token = authHeader.split(' ')[1];

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET não está configurado no ambiente');
      res.status(500).json({ message: 'Erro de configuração do servidor' });
      return;
    }

    const payload = jwt.verify(token, jwtSecret) as {
      id: string;
    };

    const userId = Number(payload.id);

    req.userId = userId;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Token expirado' });
      return;
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Token inválido' });
      return;
    }

    console.error('Erro na autenticação:', error);
    res.status(500).json({ message: 'Erro interno na autenticação' });
  }
}
