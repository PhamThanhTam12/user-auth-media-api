import { Request } from 'express'
import sharp from 'sharp'
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'
import { getNameFormFileName, handleUploadImage, handleUploadVideo } from '~/utils/file'
import fs from 'fs'
import { MediaType } from '~/constants/enums'
import { Media } from '~/models/Other'
class MediasServices {
  async uploadImage(req: Request) {
    const files = await handleUploadImage(req)
    const result = await Promise.all(
      files.map(async (file) => {
        file.newFilename = getNameFormFileName(file.newFilename) + '.jpg'
        //tạo đường dẫn mình sẽ lưu file
        const newPath = UPLOAD_IMAGE_DIR + '/' + file.newFilename
        //sharp
        await sharp(file.filepath as string)
          .jpeg()
          .toFile(newPath)
        //lưu vào folder chính thức(newPath)
        //xóa file cũ đi
        fs.unlinkSync(file.filepath)
        //trả ra link để người dùng sài
        const urlImage: Media = {
          url: `http://localhost:3000/static/image/${file.newFilename}`,
          type: MediaType.Image
        }
        return urlImage
      })
    )
    return result
  }

  async handleUploadVideo(req: Request) {
    const files = await handleUploadVideo(req)
    const result = await Promise.all(
      files.map(async (file) => {
        //trả ra link để người dùng sài
        const urlVideo: Media = {
          url: `http://localhost:3000/static/video/${file.newFilename}`,
          type: MediaType.Video
        }
        return urlVideo
      })
    )
    return result
  }
}
const mediasServices = new MediasServices()
export default mediasServices
