import express from "express";
import cors from "cors";
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import schedule from 'node-schedule'
import { giveDailyPack } from "./controllers/userController.js";

dotenv.config({ path: 'config.env' });

const PORT = process.env.PORT || 5050; 
const app = express(); 

import setRouter from "./routes/setRouter.js"
import cardRouter from "./routes/cardRouter.js"
import userRouter from "./routes/userRouter.js"
import tradeRouter from "./routes/tradeRouter.js"

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log("Connected to MongoDB")
}).catch((error) => {
    console.error("Error connecting to MongoDB:", error);
})

app.use("/api/set", setRouter)
app.use("/api/card", cardRouter)
app.use("/api/user", userRouter)
app.use("/api/trade", tradeRouter)

app.get('/', async (req, res) => {
  res.send('Hello there');
})

const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
})

schedule.scheduleJob('0 0 * * *', async() => { 
  try{
    await giveDailyPack();
  }catch(error){
    console.error('Error distributing daily packs:', error);
  }
}); 

const closeServer = () => {
  server.close(() => {
    console.log('Server closed');
  });
};

process.on('SIGINT', () => {
  console.log('Gracefully shutting down the server...');
  server.close(() => {
    console.log('Server has been shut down');
    process.exit(0); 
  });
});