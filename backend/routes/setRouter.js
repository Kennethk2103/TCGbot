import express from 'express';
import bodyParser from 'body-parser';
import { addEmptySet, getSet, editSet, getAllSets, getAllCardsNotInSet } from '../controllers/setController.js';
import {checkIfAdmin, authWithDiscordId} from '../controllers/controllerUtils.js';


const router = express.Router()

router.use(bodyParser.json());


router.use(bodyParser.json());

router.post("/", authWithDiscordId, checkIfAdmin, addEmptySet)
router.get("/", getSet)
router.get("/all", getAllSets)
router.post("/edit", authWithDiscordId, checkIfAdmin, editSet)
router.get("/notinset", getAllCardsNotInSet)

export default router 