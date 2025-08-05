import express from 'express';
import bodyParser from 'body-parser';
import { addUser } from '../controllers/userController.js';

const router = express.Router()

router.use(bodyParser.json());

router.post("/", addUser)

export default router 

