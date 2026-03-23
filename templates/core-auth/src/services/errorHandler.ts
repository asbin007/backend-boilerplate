import { NextFunction, Request, Response } from "express";

const errorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch((err: Error) => {
      console.log(err);
      res.status(500).json({
        message: "Internal error",
        errorMessage: err.message
      });
      return;
    });
  };
};

export default errorHandler;

