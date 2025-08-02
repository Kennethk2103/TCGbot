import express from 'express';
import bodyParser from 'body-parser';
import { addEmptySet } from '../controllers/setController.js';


const router = express.Router()


router.use(bodyParser.json());
//Will Want to do some admin stuff here 
router.post("/", addEmptySet)

export default router 