import express from 'express';
import bodyParser from 'body-parser';
import { addUser, setAdmin, giveUserCard, removeUserCard, getUser, getUserCards, editUserInfo, openPack, deleteUser } from '../controllers/userController.js';
import {checkIfAdmin, authWithDiscordId} from '../controllers/controllerUtils.js';

const router = express.Router()

router.use(bodyParser.json());

router.post("/", addUser)
router.post("/admin", setAdmin)
router.post("/addCard", authWithDiscordId, checkIfAdmin, giveUserCard)
router.post("/removeCard", authWithDiscordId, checkIfAdmin, removeUserCard)
router.post("/edit", editUserInfo)
router.post("/open", openPack)
router.get("/", getUser)
router.get("/cards", getUserCards)
router.delete("/", authWithDiscordId, checkIfAdmin, deleteUser)

export default router 

