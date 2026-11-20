import { pick } from 'lodash'
import { Request, Response, NextFunction } from 'express'
// filterKeys là mảng chứa chuỗi tên của các key
export const filterMiddleware = <T>(filterKeys: Array<keyof T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.body = pick(req.body, filterKeys) // đưa cái body và danh sách muốn giữ
    next()
  }
}
