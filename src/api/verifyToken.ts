import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export default function verifyToken(req: Request, res: Response, next: NextFunction) : void {
  try {
    if(!req.headers.authorization) return next();
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, "**** my_secret_key ****");
    (<any>req).auth = decoded;
  } catch(error) {
    console.error("---------> invalid token. \n---------> With following error: ", error);
  }
  next();
} 