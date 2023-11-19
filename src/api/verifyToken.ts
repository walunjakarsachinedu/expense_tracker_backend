import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import GraphqlErrors from './errors.js';
import config from 'config';

export default function verifyToken(req: Request, res: Response, next: NextFunction) : void {
  try {
    if(!req.headers.authorization) return next();
    const token = req.headers.authorization.split(' ')[1];
    const jwtSecret: string = config.get("jwt_secret");
    const decoded = jwt.verify(token, jwtSecret);
    const isTokenExpired = Date.now() >= (<jwt.JwtPayload>decoded).exp * 1000;
    if (isTokenExpired) throw GraphqlErrors.TOKEN_EXPIRED;
    (<any>req).auth = decoded;
  } catch(error) { }
  next();
} 