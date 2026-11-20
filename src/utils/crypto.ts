//hàm mã hóa 1 nội dung 1 bất kỳ theo chuẩn

import { createHash } from 'crypto'

//SHA256 + digest hex
function sha256(content: string) {
  return createHash('sha256').update(content).digest('hex')
}

export function hashPassword(password: string) {
  return sha256(password + process.env.PASSWORD_SECRET)
}
