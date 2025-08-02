import express from "express";
import cors from "cors";
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'config.env' });

const PORT = process.env.PORT || 5050; 
const app = express(); 

import setRouter from "./routes/setRouter.js"

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log("Connected to MongoDB")
}).catch((error) => {
    console.error("Error connecting to MongoDB:", error);
})

app.use("/api/set", setRouter)

app.get('/', async (req, res) => {
  res.send('Hello there');
})

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
})

const closeServer = () => {
  server.close(() => {
    console.log('Server closed');
  });
};

process.on('SIGINT', () => {
  console.log('Gracefully shutting down the server...');
  server.close(() => {
    console.log('Server has been shut down');
    process.exit(0);  // Exit process to allow coverage reporting
  });
});