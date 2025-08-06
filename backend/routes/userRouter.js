import express from 'express';
import bodyParser from 'body-parser';
import { addUser, setAdmin, giveUserCard } from '../controllers/userController.js';

const router = express.Router()

router.use(bodyParser.json());

router.post("/", addUser)
router.post("/admin", setAdmin)
router.post("/addCard", giveUserCard)

export default router 

