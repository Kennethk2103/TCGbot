import express from 'express';
import bodyParser from 'body-parser';
import { addUser, setAdmin, giveUserCard, removeUserCard, getUser, getUserCards, editUserInfo, openPack, deleteUser } from '../controllers/userController.js';

const router = express.Router()

router.use(bodyParser.json());

router.post("/", addUser)
router.post("/admin", setAdmin)
router.post("/addCard", giveUserCard)
router.post("/removeCard", removeUserCard)
router.post("/edit", editUserInfo)
router.post("/open", openPack)
router.get("/", getUser)
router.get("/cards", getUserCards)
router.delete("/", deleteUser)

export default router 

