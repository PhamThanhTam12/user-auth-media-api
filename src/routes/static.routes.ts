import express from 'express'
import { serveSingleImageController, serveSingleVideoController } from '~/controllers/medias.controllers'
import { wrapAsync } from '~/utils/handler'
const staticRouter = express.Router()

staticRouter.get('/image/:filename', wrapAsync(serveSingleImageController))
staticRouter.get('/video/:filename', wrapAsync(serveSingleVideoController))
export default staticRouter
//verify email//?verify_email_token
