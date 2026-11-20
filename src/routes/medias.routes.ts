import { Router } from 'express'
import { uploadImageController, uploadVideoController } from '~/controllers/medias.controllers'
import { wrapAsync } from '~/utils/handler'
const mediaRoutes = Router()

//tạo route để người dùng update ảnh
mediaRoutes.post('/upload-image', wrapAsync(uploadImageController))
mediaRoutes.post('/upload-video', wrapAsync(uploadVideoController))

export default mediaRoutes
