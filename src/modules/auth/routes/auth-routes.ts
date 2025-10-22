import { Router } from 'express';
import { SignUpSchema } from '../validations/signup-schema';
import { validate } from '../../../common/middlewares/validation-middleware';
import { makeAuthController } from '../../../common/factories/auth/auth-controller-factory';
import { LoginSchema } from '../validations/login-schema';
import { requestPasswordResetSchema } from '../validations/request-password-reset-schema';
import { passwordResetSchema } from '../validations/password-reset-schema';

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

  router.post(
    '/request-password-reset',
    validate(requestPasswordResetSchema),
    (req, res, next) => authController.requestPasswordReset(req, res, next)
  );
  router.post(
    '/reset-password',
    validate(passwordResetSchema),
    (req, res, next) => authController.resetPassword(req, res, next)
  );
};
