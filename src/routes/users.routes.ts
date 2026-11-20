import express from 'express'
import { access } from 'fs'
import { register } from 'module'
import {
  changePasswordController,
  forgotPasswordController,
  getMeController,
  loginController,
  logoutController,
  refreshTokenController,
  registerController,
  resendEmailVerifyController,
  resetPasswordController,
  updateMeController,
  verifyEmailController,
  verifyForgotPasswordTokenController
} from '~/controllers/users.controllers'
import { filterMiddleware } from '~/middlewares/common.middlewares'
import {
  accessTokenValidator,
  changePasswordValidator,
  emailVerifyTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  updateMeValidator,
  verifyForgotPasswordTokenValidator
} from '~/middlewares/users.middlewares'
import RefreshToken from '~/models/RefreshToken.schema'
import { UpdateMeReqBody } from '~/models/request/User.requests'
import { wrapAsync } from '~/utils/handler'
const usersRoutes = express.Router()
/*login
path: /users/login
method: POST
headers | body | params | query
body: {
    email: string,
    password: string
}
    loginValidator: kiểm tra tính hợp lệ của email, password
    loginController: kiểm tra database(services), đóng gọi kiện hàng
*/

usersRoutes.post('/login', loginValidator, wrapAsync(loginController))

/*register: dang ki
path: users/register
method:post
body:{
    email: string,
    name: string,
    password: string,
    confirm_password:string,
    date_of_birth:ISO8601
}
*/
usersRoutes.post('/register', registerValidator, wrapAsync(registerController))

/*
path: /users/logout
method: post
header{
    Authorization: 'Bear access_token'
}
body:{
 refresh_tokenL string
}
 */
usersRoutes.post(
  '/logout',
  accessTokenValidator, //
  refreshTokenValidator,
  wrapAsync(logoutController)
)

/**
 verify email
 des: người dùng bấm vào link trong email, là gián tiếp gửi lại email_verify_token cho mình thông qua request query
 path: /users?verify-email/?email_verify_email: string
 */

/*
des:người dùng yêu cầu gửi lại mail verify
path: /users/resend-verify-email
method: POST ( muốn gửi lên thì phải cho bt e là ai, gửi vào mail nào)
Header:{Authorization: Bearer <access_token>} //đăng nhập mới cho resend email verify
body: {}
*/
usersRoutes.get('/verify-email/', emailVerifyTokenValidator, wrapAsync(verifyEmailController))
usersRoutes.post('/resend-verify-email', accessTokenValidator, wrapAsync(resendEmailVerifyController))

/*
des: nhận email cần khôi phục tài khoản, và gữi mail kèm token để khôi phục vào email đó
path: /forgot-password
method: POST
Header: không cần, vì  ngta quên mật khẩu rồi, thì sao mà đăng nhập để có authen đc
body: {email: string}
forgotPasswordController: kiểm tra email này có tồn tại trong database không
nếu có thì tạo link kèm forgot_password_token và gữi email cho người dùng
*/
usersRoutes.post(
  '/forgot-password',
  forgotPasswordValidator, //kiểm tra email ng dùng gửi lên qua body
  wrapAsync(forgotPasswordController)
)

/*verrify forgot password token
des: người dùng bấm vào link trong mail là gửi forgot_password _token cho FE
FE sẽ gửi lại forgot_password_token vè backend để kiểm tra verify
trước khi hiển thị giao diện nhập mật khẩu mới
path:/users/verify-forgot-password
method: POST
body:{
  fotgot_password_token: string
}
 */
usersRoutes.post(
  '/verify-forgot-password',
  verifyForgotPasswordTokenValidator,
  wrapAsync(verifyForgotPasswordTokenController)
)

/*
  des: người dùng nhập mật khẩu mới và gửi về backend để cập nhật
  path: users/reset-password
  method: POST
  body:{
  forgot_password_token: string,
  password:string,
  confirm_password: string
  }
*/

usersRoutes.post(
  '/reset-password',
  verifyForgotPasswordTokenValidator,
  resetPasswordValidator,
  wrapAsync(resetPasswordController)
)

/* 
getME
des: lấy thông tin người dùng đagn đăng nhập
path: /users/me
method: POST(vì mình phải cho hệ thống bt minh flaf ai)
headers{
Authorization: 'Bearer access_token' (cung cấp access token để bt mình là ai)
}
*/
usersRoutes.post('/me', accessTokenValidator, wrapAsync(getMeController))

/*
des: update profile của user
path: '/me'
method: patch
Header: {Authorization: Bearer <access_token>}
body: {
  name?: string
  date_of_birth?: Date
  bio?: string // optional
  location?: string // optional
  website?: string // optional
  username?: string // optional
  avatar?: string // optional
  cover_photo?: string // optional}
*/

usersRoutes.patch(
  '/me',
  filterMiddleware<UpdateMeReqBody>([
    'name',
    'date_of_birth',
    'bio',
    'location',
    'website',
    'avatar',
    'username',
    'cover_photo'
  ]),
  accessTokenValidator,
  updateMeValidator,
  wrapAsync(updateMeController)
)

/*
  desc: change-pass
  chức năng thay đổi pass
  method: put
  header:{
    Authorization: 'Bearer '
  }
  body: {
    old_password: string,
    password: string,
    confirm_password: string
  }
*/
usersRoutes.put('/change-password', accessTokenValidator, changePasswordValidator, wrapAsync(changePasswordController))
/*refresh-token
  khi người dùng hết hạn access_token thì họ sẽ gửi refresh_token lên để xin
  access_token và refresh_token mới
  path: users/refresh-token
  method:post
  body:{
    refresh_token: string
  }
*/
usersRoutes.post('/refresh-token', refreshTokenValidator, wrapAsync(refreshTokenController))
export default usersRoutes
