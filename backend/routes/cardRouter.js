import express from 'express';
import multer from 'multer';
import bodyParser from 'body-parser';
import { addCard, getCard, removeCardFromSet, deleteCard, editCard, addOrMoveTOSet, getAllCards } from '../controllers/cardController.js';

const router = express.Router()

router.use(bodyParser.json());

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg and .gif formats are allowed!'), false);
        }
    }
});


//Will Want to do some admin stuff here 
router.post("/", upload.single('Artwork'), addCard)
router.post("/edit", upload.single('Artwork'), editCard)
router.get("/", getCard)
router.post("/remove", removeCardFromSet)
router.delete("/", deleteCard)
router.post("/move", addOrMoveTOSet)
router.get("/all", getAllCards)

export default router 