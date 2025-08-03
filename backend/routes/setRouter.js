import express from 'express';
import bodyParser from 'body-parser';
import { addEmptySet, getSet, editSet, getAllSets, getAllCardsNotInSet } from '../controllers/setController.js';


const router = express.Router()

router.use(bodyParser.json());


router.use(bodyParser.json());
//Will Want to do some admin stuff here 
router.post("/", addEmptySet)
router.get("/", getSet)
router.get("/all", getAllSets)
router.post("/edit", editSet)
router.get("/notinset", getAllCardsNotInSet)

export default router 