import { NextFunction, Request, Response } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import { configPath, getConfig } from "../config-path.js";
import { ErrorCodes, getError } from "./errors.js";

/** verify token & add token payload to request context at auth property */
export default function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    if (!req.headers.authorization) return next();
    const token = req.headers.authorization.split(" ")[1];
    const jwtSecret: string = getConfig(configPath.jwt_secret);
    const decoded = jwt.verify(token, jwtSecret);
    (<any>req).auth = decoded;
  } catch (error) {
    (<any>req).tokenError =
      error instanceof TokenExpiredError
        ? getError(ErrorCodes.TOKEN_EXPIRED)
        : getError(ErrorCodes.INVALID_TOKEN);
  }
  next();
}
