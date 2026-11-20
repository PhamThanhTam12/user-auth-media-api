import express from 'express'
import usersRoutes from './routes/users.routes'
import databaseServices from './services/database.services'
import { defaultErrorHandler } from './middlewares/error.middlewares'
import mediaRoutes from './routes/medias.routes'
import { initFolder } from './utils/file'
import staticRouter from './routes/static.routes'

const app = express()
databaseServices.connect()
initFolder()
const PORT = 3000
app.use(express.json())
//localhost:3000/
app.get('/', (req, res) => {
  res.send(`Hello`)
})
app.use('/users', usersRoutes)
app.use('/medias', mediaRoutes)
app.use('/static', staticRouter)
//
app.use(defaultErrorHandler)
//mở server ở cổng
app.listen(PORT, () => {
  console.log(`server đang mở ở localhost: ${PORT} `)
})

// let date = new Date(1999, 3, 23)
// console.log(date.toISOString())
