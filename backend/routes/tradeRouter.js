import express from 'express';
import bodyParser from 'body-parser';
import { addTrade, editTrade, acceptTrade, rejectTrade, getTrade, getUserTrades } from '../controllers/tradeController.js';

const router = express.Router();

router.use(bodyParser.json());

router.post('/', addTrade);
router.post('/edit', editTrade);
router.post('/accept', acceptTrade);
router.post('/reject', rejectTrade);
router.get('/', getTrade);
router.get('/getAll', getUserTrades);

export default router;
