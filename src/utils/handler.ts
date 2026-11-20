//hàm nhận vào requestHandler:(req,res,next) =>{}
//và biến nó thành 1 rehanler khác
import { NextFunction, Request, RequestHandler, Response } from 'express'
//có cấu trúc try catcg next
export const wrapAsync = <P, T>(func: RequestHandler<P, any, any, T>) => {
  return async (req: Request<P, any, any, T>, res: Response, next: NextFunction) => {
    try {
      await func(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}
