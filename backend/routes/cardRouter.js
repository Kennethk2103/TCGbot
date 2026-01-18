import express from 'express';
import multer from 'multer';
import bodyParser from 'body-parser';
import { addCard, getCard, removeCardFromSet, deleteCard, editCard, addOrMoveTOSet, getAllCards, addMany, getCardForDiscordSoIDontWantToDie } from '../controllers/cardController.js';
import {checkIfAdmin, authWithDiscordId} from '../controllers/controllerUtils.js';

const router = express.Router()

router.use(bodyParser.json());

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', "image/webp"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg and .gif formats are allowed!'), false);
        }
    }
});

const uploadMany = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
            cb(null, true);
        } else {
            cb(new Error('Only .zip files are allowed!'), false);
        }
    }
});


//Will Want to do some admin stuff here 
router.post(
  "/",
  //authWithDiscordId,
  //checkIfAdmin,
  (req, res, next) => {
    upload.single("Artwork")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  addCard
);

//Dont forget to add authWithDiscordId, checkIfAdmin, to all these 
router.post("/edit",  upload.single('Artwork'), editCard)
router.post("/many", uploadMany.single('Zipfile'), addMany)
router.get("/", getCard)
router.post("/remove", authWithDiscordId, checkIfAdmin, removeCardFromSet)
router.delete("/", authWithDiscordId, checkIfAdmin, deleteCard)
router.post("/move", authWithDiscordId, checkIfAdmin, addOrMoveTOSet)
router.get("/all", authWithDiscordId, getAllCards)
router.get("/discordCard", getCardForDiscordSoIDontWantToDie) //special route to get card by discordID query param
export default router 