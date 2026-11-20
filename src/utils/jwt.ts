import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { TokenPayLoad } from '~/models/request/User.requests'
dotenv.config()
//tạo hàm ký token
export const signToken = ({
  payload,
  privateKey,
  options = { algorithm: 'HS256' }
}: {
  payload: any
  privateKey: string
  options?: jwt.SignOptions
}) => {
  return new Promise<string>((resolve, reject) => {
    jwt.sign(payload, privateKey, options, function (err, token) {
      if (err) throw reject(err)
      return resolve(token as string)
    })
  })
}

export const verifyToken = ({ token, privateKey }: { token: string; privateKey: string }) => {
  //trả về JwtPayload(thông tin người gữi req) nếu token hợp lệ
  return new Promise<TokenPayLoad>((resolve, reject) => {
    //method này sẽ verify token, nếu token hợp lệ thì nó sẽ trả về payload
    //nếu token không hợp lệ thì nó sẽ throw error
    //secretOrPublicKey dùng để verify token
    //nếu token được tạo ra bằng secret|PublicKey thì ta dùng secret|PublicKey key để verify
    //từ đó biết rằng access_token được tạo bởi chính server
    jwt.verify(token, privateKey, (error, decoded) => {
      if (error) throw reject(error)
      resolve(decoded as TokenPayLoad)
    })
  })
}
