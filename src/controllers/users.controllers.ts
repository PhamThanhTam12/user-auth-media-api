import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import usersService from '~/services/users.services'
import { NextFunction, ParamsDictionary } from 'express-serve-static-core'
import {
  ChangePasswordReqBody,
  ForgotPasswordReqBody,
  LoginReqBody,
  LogoutReqBody,
  RefeshTokenReqBody,
  RegisterReqBody,
  ResetPasswordReqBody,
  TokenPayLoad,
  UpdateMeReqBody,
  VerifyEmailReqQuery,
  VerifyForgotPasswordReqBody
} from '~/models/request/User.requests'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
import { USERS_MESSAGES } from '~/constants/messages'
import { UserVerifyStatus } from '~/constants/enums'
import databaseServices from '~/services/database.services'
import { result } from 'lodash'
export const loginController = async (req: Request<ParamsDictionary, any, LoginReqBody>, res: Response) => {
  //dữ liệu dc gửi lên cho mình thông qua body gồm email và password
  const result = await usersService.login(req.body)
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.LOGIN_SUCCESS,
    result
  })
}

export const registerController = async (req: Request<ParamsDictionary, any, RegisterReqBody>, res: Response) => {
  //khui loi trong request
  // du lieu vao dc den day nghia la sach roi ok roi( du va sach)
  //kiem tra tinh dun(logic - co lien quan den database)g cua du lieu
  //kiem tra email co ng dung chua
  // tao user moi neu chua co
  //dong goi response
  const isExist = await usersService.checkEmailExist(req.body.email)
  if (isExist) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
      message: USERS_MESSAGES.EMAIL_ALREADY_EXISTS
    })
  }
  const result = await usersService.register(req.body)
  //dong goi res
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.REGISTER_SUCCESS,
    result
  })
}

export const logoutController = async (req: Request<ParamsDictionary, any, LogoutReqBody>, res: Response) => {
  //đến đây thì dữ liệu đã sạch và ac và rf đã dc decode
  //mình sẽ đánh 2 user_id trong payload của ac và rf
  const { user_id: user_id_ac } = req.decoded_authorization as TokenPayLoad
  const { user_id: user_id_rf } = req.decoded_refresh_token as TokenPayLoad
  if (user_id_ac !== user_id_rf) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNAUTHORIZED,
      message: USERS_MESSAGES.Refresh_TOKEN_IS_INVALID
    })
  }
  //kiểm tra (tìm) xem rf còn tồn tại trong database hay ko?
  await usersService.checkRefreshToken({
    user_id: user_id_rf,
    refresh_token: req.body.refresh_token
  })
  //nếu còn thì tiến hành xóa
  await usersService.logout(req.body.refresh_token)
  //thông báo thành công
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.LOGIN_SUCCESS
  })
  // console.log(req.decoded_authorization)
  // res.json({ message: 'Logout success' })
}

export const verifyEmailController = async (
  req: Request<ParamsDictionary, any, any, VerifyEmailReqQuery>,
  res: Response
) => {
  //kiểm tra xem email_verify_token này có
  //phải thuộc sở hữu của user_id không?
  const { email_verify_token } = req.query
  const { user_id } = req.decoded_email_verify_token as TokenPayLoad
  await usersService.checkEmailVerifyToken({
    user_id,
    email_verify_token
  })
  await usersService.verifyEmail(user_id)
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.EMAIL_VERIFY_SUCCESS
  })
  //nếu ok thì mình sẽ verifyEmail(cập nhật thông tin user)
}
export const resendEmailVerifyController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const verify = await usersService.getVerifyStatus(user_id)
  //nếu trạng thái của người dùng là verifide thì mình ko gửi lại link
  if (verify == UserVerifyStatus.Verified) {
    return res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
    })
  }
  if (verify == UserVerifyStatus.Banned) {
    return res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.ACCOUNT_HAS_BEEN_BANNED
    })
  }
  if (verify == UserVerifyStatus.Unverified) {
    await usersService.resendVerifyEmail(user_id)
    return res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.RESEND_VERIFY_EMAIL_SUCCESS
    })
  }
}
export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordReqBody>,
  res: Response
) => {
  const { email } = req.body
  const isExisted = await usersService.checkEmailExist(email)
  if (!isExisted) {
    //nếu không có user nào từ email này thì thông báo lỗi
    throw new ErrorWithStatus({
      message: USERS_MESSAGES.USER_NOT_FOUND,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY
    })
  }
  //nếu có thì mình tạo forgot_password_token và gửi mail
  await usersService.forgotPassword(email)
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.CHECK_YOUR_EMAIL_TO_RESET_PASSWORD
  })
}

export const verifyForgotPasswordTokenController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPasswordReqBody>,
  res: Response
) => {
  //mình sẽ kiểm tra forgot_password_token có còn thuộc sở hữu
  //của user_id hay ko
  //nếu có thì forgot_password_token đã verify
  const { forgot_password_token } = req.body
  const { user_id } = req.decoded_forgot_password_token as TokenPayLoad
  await usersService.checkForgotPasswordToken({
    user_id,
    forgot_password_token
  })
  //nếu có thì nghĩa là forgot_password_token đã verify
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS
  })
}

export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response
) => {
  //vì người dùng có gửi forgot_password_token
  //nên mình cần kiểm tra xem nó có hợp lệ không với user_id không
  //nếu có thì tiến hành đổi mật khẩu
  const { forgot_password_token } = req.body
  const { user_id } = req.decoded_forgot_password_token as TokenPayLoad
  const { password } = req.body
  await usersService.checkForgotPasswordToken({
    user_id,
    forgot_password_token
  })
  //nếu có thì mình tiến hành đổi mk
  await usersService.resetPassword({
    user_id,
    password
  })
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS
  })
}

export const getMeController = async (req: Request, res: Response) => {
  //kiểm tra user_id còn tồn tại ko nếu có thì hiển thị thông tin
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const userInfor = await usersService.getMe(user_id)
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.GET_ME_SUCCESS,
    result: userInfor
  })
}

export const updateMeController = async (req: Request<ParamsDictionary, any, UpdateMeReqBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const verify = await usersService.getVerifyStatus(user_id)
  if (verify != UserVerifyStatus.Verified) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message: USERS_MESSAGES.USER_NOT_VERIFIED
    })
  }
  await usersService.updateMe({ user_id, payload: req.body })
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.UPDATE_PROFILE_SUCCESS
  })
}

export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const { old_password, password } = req.body
  await usersService.changePassword({
    user_id,
    old_password,
    password
  })
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS
  })
}

export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefeshTokenReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_refresh_token as TokenPayLoad
  const { refresh_token } = req.body
  await usersService.checkRefreshToken({ user_id, refresh_token })
  //nếu mà kiểm tra ko có bug gì thì mình tiến hành refresh cho ngta
  const result = await usersService.refreshToken({ user_id, refresh_token })
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.REFRESH_TOKEN_SUCCESS,
    result
  })
}
