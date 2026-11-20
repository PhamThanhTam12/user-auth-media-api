import { Collection, Db, MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import User from '~/models/User.schema'
import RefreshToken from '~/models/RefreshToken.schema'
dotenv.config() //ket noi voi file env
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.nusxciw.mongodb.net/?appName=Cluster0`
class DatabaseServices {
  private client: MongoClient
  private db: Db
  constructor() {
    this.client = new MongoClient(uri)
    this.db = this.client.db(process.env.DB_NAME)
  }

  async connect() {
    try {
      // Send a ping to confirm a successful connection
      await this.db.command({ ping: 1 })
      console.log('Pinged your deployment. You successfully connected to MongoDB!')
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  //method ket noi cllection users// chưa có sẽ tạo
  get users(): Collection<User> {
    return this.db.collection(process.env.DB_USERS_COLLECTION as string)
  }
  get refreshTokens(): Collection<RefreshToken> {
    return this.db.collection(process.env.DB_REFRESH_TOKENS_COLLECTION as string)
  }
}
//dependency injection pattern
let databaseServices = new DatabaseServices()
// databaseServices.users.insertOne()
export default databaseServices
