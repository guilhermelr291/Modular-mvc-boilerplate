import { Router } from 'express';
import { SignUpSchema } from '../validations/signup-schema';
import { validate } from '../../../common/middlewares/validation-middleware';
import { makeAuthController } from '../../../common/factories/auth/auth-controller-factory';
import { LoginSchema } from '../validations/login-schema';

const authController = makeAuthController();

export default (router: Router): void => {
  router.post('/auth/signup', validate(SignUpSchema), (req, res, next) =>
    authController.signUp(req, res, next)
  );
  router.post('/auth/login', validate(LoginSchema), (req, res, next) =>
    authController.login(req, res, next)
  );

  router.post('/auth/refresh', (req, res, next) =>
    authController.refreshAccessToken(req, res, next)
  );
};
