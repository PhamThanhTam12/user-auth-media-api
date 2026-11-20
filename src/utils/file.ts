//viết hàm kiểm tra thư mục dự án có folder uploads không
//chứa các func xử lý file
//tạo hàm tự hàm folder uploads
import path, { resolve } from 'path'
import fs from 'fs'
import { UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'
import formidable, { File } from 'formidable'
import { Request } from 'express'
import { reject } from 'lodash'
//nếu chưa có thì tạo
export const initFolder = () => {
  ;[UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {
        recursive: true
      })
    }
  })
  //lưu đường dẫn đến thư mục lưu ảnh
  // const uploadsFolderPath = path.resolve('uploads')
  //kiểm tra uploadsFolderPath có đưa mình đến folder nào k
}

export const handleUploadImage = (req: Request) => {
  //tiếp nhận file từ req, kiểm tra formidable và lưu tạm
  const form = formidable({
    maxFiles: 4, // nhận tối đa 1 file
    maxFileSize: 1024 * 300, //300kb kích thước tối đa
    keepExtensions: true,
    maxTotalFileSize: 300 * 1024 * 4,
    uploadDir: path.resolve(UPLOAD_IMAGE_TEMP_DIR),
    filter: function ({ name, originalFilename, mimetype }) {
      //name là trường dữ liệu được gửi từ form
      //originalFilename: tên gốc của file
      //mimetype: loại file của type
      const valid = name === 'image' && Boolean(mimetype?.includes('image/'))
      if (!valid) form.emit('error' as any, new Error('Not File Type') as any)
      return valid
    }
  })
  //tạo ra rồi sài
  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }
      //nếu ko có lỗi trong quá trình parse
      if (!files.image) {
        return reject(new Error('Image is empty'))
      }
      //nếu mà có gửi và đầy đủ thì
      return resolve(files.image as File[])
    })
  })
}

export const handleUploadVideo = (req: Request) => {
  //tiếp nhận file từ req, kiểm tra formidable và lưu tạm
  const form = formidable({
    maxFiles: 1, // nhận tối đa 1 file
    maxFileSize: 50 * 1024 * 1024, //50Mb kích thước tối đa 1 file
    keepExtensions: true,
    uploadDir: UPLOAD_VIDEO_DIR,
    filter: function ({ name, originalFilename, mimetype }) {
      //name là trường dữ liệu được gửi từ form
      //originalFilename: tên gốc của file
      //mimetype: loại file của type
      const valid = name === 'video' && Boolean(mimetype?.includes('video/'))
      if (!valid) form.emit('error' as any, new Error('Not File Type') as any)
      return valid
    }
  })
  //tạo ra rồi sài
  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }
      //nếu ko có lỗi trong quá trình parse
      if (!files.video) {
        return reject(new Error('Video is empty'))
      }
      //nếu mà có gửi và đầy đủ thì
      return resolve(files.video as File[])
    })
  })
}
export const getNameFormFileName = (filename: string) => {
  const nameArr = filename.split('.')
  nameArr.pop()
  return nameArr.join('.')
}
export const geExtFormFileName = (filename: string) => {
  const nameArr = filename.split('.')
  return nameArr.pop()
}
