import User from '~/models/User.schema'
import databaseService from './database.services'
import { LoginReqBody, RegisterReqBody, UpdateMeReqBody } from '~/models/request/User.requests'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import { StringValue } from 'ms'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import { ObjectId } from 'mongodb'
import RefreshToken from '~/models/RefreshToken.schema'
import { log } from 'console'
import { update } from 'lodash'
import databaseServices from './database.services'

class UsersService {
  private signAccessToken(user_id: string) {
    return signToken({
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      payload: { user_id, token_type: TokenType.AccessToken },
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN as StringValue }
    })
  }

  private signRefreshToken(user_id: string) {
    return signToken({
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      payload: { user_id, token_type: TokenType.RefeshToken },
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN as StringValue }
    })
  }

  private signEmailVerifyToken(user_id: string) {
    return signToken({
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      payload: { user_id, token_type: TokenType.EmailVerificationToken },
      options: { expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRE_IN as StringValue }
    })
  }

  private signForgotPasswordToken(user_id: string) {
    return signToken({
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      payload: { user_id, token_type: TokenType.ForgotPasswordToken },
      options: { expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRE_IN as StringValue }
    })
  }
  async register(payload: RegisterReqBody) {
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken(user_id.toString())
    const result = await databaseService.users.insertOne(
      new User({
        _id: user_id,
        username: `user${user_id.toString()}`,
        email_verify_token,
        ...payload,
        date_of_birth: new Date(payload.date_of_birth), //ghi đè lại date of birth
        password: hashPassword(payload.password)
      })
    )
    //
    // const user_id = result.insertedId.toString()
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id.toString()),
      this.signRefreshToken(user_id.toString())
    ])
    //thiếu hành động lưu mã refesh token vào databas
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        user_id: new ObjectId(user_id),
        token: refresh_token
      })
    )
    //tạo link và gửi qua mail
    console.log(`http://localhost:3000/users/verify-email/?email_verify_token=${email_verify_token}`)
    //
    return {
      access_token,
      refresh_token
    }
  }
  async checkEmailExist(email: String) {
    const user = await databaseService.users.findOne({ email })
    return Boolean(user)
  }
  async login(payload: LoginReqBody) {
    //tìm user sở hữu 2 thông tin email và pass
    const user = await databaseService.users.findOne({ ...payload, password: hashPassword(payload.password) })
    //nếu ko tìm dc
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        message: USERS_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT
      })
    }
    //nếu có user thì sao thì tạo access và refesh từ id của user tìm dc
    const user_id = user._id.toString()
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        user_id: new ObjectId(user_id),
        token: refresh_token
      })
    )
    return {
      access_token,
      refresh_token
    }
  }

  async checkRefreshToken({ user_id, refresh_token }: { user_id: string; refresh_token: string }) {
    const refreshToken = await databaseService.refreshTokens.findOne({
      user_id: new ObjectId(user_id),
      token: refresh_token
    })
    if (!refreshToken) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USERS_MESSAGES.Refresh_TOKEN_IS_INVALID
      })
    }
    return true
  }

  async logout(refresh_token: string) {
    await databaseService.refreshTokens.deleteOne({ token: refresh_token })
    return true
  }
  async checkEmailVerifyToken({ user_id, email_verify_token }: { user_id: string; email_verify_token: string }) {
    const user = await databaseService.users.findOne({ email_verify_token, _id: new ObjectId(user_id) })
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED, //401
        message: USERS_MESSAGES.EMAIL_VERIFY_TOKEN_IS_INVALID
      })
    }
  }
  async verifyEmail(user_id: string) {
    //cập nhật lại user
    await databaseService.users.updateOne(
      {
        _id: new ObjectId(user_id)
      },
      [
        {
          $set: {
            verify: UserVerifyStatus.Verified, //1
            email_verify_token: '',
            updated_at: '$$NOW'
          }
        }
      ]
    )
    //update xong thì thoi
  }
  async getVerifyStatus(user_id: string) {
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }
    return user.verify
  }
  async resendVerifyEmail(user_id: string) {
    const email_verify_token = await this.signEmailVerifyToken(user_id)
    await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          email_verify_token,
          updated_at: '$$NOW'
        }
      }
    ])
    console.log(`http://localhost:3000/users/resend-verify-email/?email_verify_token=${email_verify_token}`)
  }
  async forgotPassword(email: string) {
    //tìm user từ email để lấy user_id
    //từ userid sẽ tạo mã
    const user = await databaseService.users.findOne({ email })
    const user_id = user!._id.toString() //đảm bảo có user rồi
    const forgot_password_token = await this.signForgotPasswordToken(user_id)
    await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: { forgot_password_token, updated_at: '$$NOW' }
      }
    ])
    console.log(`http://localhost:8000/users/reset-password/?forgot_password_token=${forgot_password_token}`)
  }
  async checkForgotPasswordToken({
    user_id,
    forgot_password_token
  }: {
    user_id: string
    forgot_password_token: string
  }) {
    //với 2 thông tin trên mình tìm user sỡ hữu cả 2
    //nếu có nghĩa là mã token còn hiệu lực
    const user = await databaseService.users.findOne({
      _id: new ObjectId(user_id),
      forgot_password_token
    })
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
        message: USERS_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_INVALID
      })
    }
    //nếu có thì thôi ko cần làm gì cả
  }
  // async resetPassword =  ({user_id, password}: {user_id:string, password:string } ){
  //   await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
  //     {
  //       $set: {
  //         password: hashPassword(password),
  //         forgot_password_token: '',
  //         updated_at: '$$NOW'
  //       }
  //     }
  //   ])
  // }
  async resetPassword({ user_id, password }: { user_id: string; password: string }) {
    await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          password: hashPassword(password),
          forgot_password_token: '',
          updated_at: '$$NOW'
        }
      }
    ])
  }

  async getMe(user_id: string) {
    const user = await databaseService.users.findOne(
      { _id: new ObjectId(user_id) },
      {
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }
    return user
  }

  async updateMe({ user_id, payload }: { user_id: string; payload: UpdateMeReqBody }) {
    //trong payload có date_of_birth và username là 2 trường đặc biệt
    const _payload = payload.date_of_birth ? { ...payload, date_of_birth: new Date(payload.date_of_birth) } : payload
    if (payload.username) {
      const user = await databaseService.users.findOne({
        username: payload.username
      })
      //nếu có user r thì báo lỗi
      if (user) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          message: USERS_MESSAGES.USERNAME_ALREADY_EXISTS
        })
      }
    }
    const userInfor = await databaseService.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      [
        {
          $set: {
            ..._payload,
            updated_at: '$$NOW'
          }
        }
      ],
      {
        returnDocument: 'after', //trả về document sau khi update
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    return userInfor
  }
  async changePassword({
    user_id,
    old_password,
    password
  }: {
    user_id: string
    old_password: string
    password: string
  }) {
    //dựa vào user_id và old_password tìm xem có user nào ko
    const user = await databaseService.users.findOne({
      _id: new ObjectId(user_id),
      password: hashPassword(old_password)
    })
    //nếu ko có nghĩa là người dùng nhập sai password
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }
    //neaeus tìm dc, thì nghĩa là nhập đúng tiến hành cập nhật mới
    await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          password: hashPassword(password),
          updated_at: '$$NOW'
        }
      }
    ])
  }
  async refreshToken({ user_id, refresh_token }: { user_id: string; refresh_token: string }) {
    //tạo ac và rf mới
    const [access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    //xóa rf cũ
    await databaseService.refreshTokens.deleteOne({ token: refresh_token })
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        token: new_refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    //lưu rf mới

    //gửi cho người dùng
    return {
      access_token,
      refresh_token: new_refresh_token
    }
  }
}
const usersService = new UsersService()
export default usersService
