import { NextFunction, Request, Response } from 'express'
import { ValidationChain, validationResult } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema'
import ms from 'ms'
import HTTP_STATUS from '~/constants/httpStatus'
import { EntityError, ErrorWithStatus } from '~/models/Errors'

export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await validation.run(req) //chay check va luu vao req
    const error = validationResult(req)
    if (error.isEmpty()) {
      return next()
    }
    const errorObject = error.mapped()
    const entityError = new EntityError({ errors: {} })
    // errorObject xử lý riêng
    for (const key in errorObject) {
      const { msg } = errorObject[key]
      if (msg instanceof ErrorWithStatus && msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY) {
        return next(msg)
      }
      entityError.errors[key] = msg
    }
    return next(entityError)
    // return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
    //   error: errorObject
    // })
  }
}
