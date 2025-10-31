import express from 'express';
import setupRoutes from './routes';
import { errorHandler } from '../common/middlewares/error-handler-middleware';
import { checkAuth } from '../common/middlewares/check-auth-middleware';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
    credentials: true,
  })
);

app.use(express.json());
app.use(checkAuth);
setupRoutes(app);
app.use(errorHandler);

export default app;
