import express from 'express';
import bodyParser from 'body-parser';
import { addUser, setAdmin } from '../controllers/userController.js';

const router = express.Router()

router.use(bodyParser.json());

router.post("/", addUser)
router.post("/admin", setAdmin)

export default router 

