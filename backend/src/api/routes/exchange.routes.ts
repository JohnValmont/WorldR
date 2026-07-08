import { Router } from 'express';
import { ShareMarketController } from '../controllers/shareMarket.controller';
import { IpoExchangeController } from '../controllers/ipoExchange.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

// ── Secondary market (continuous order book) ──
router.get('/listings', ShareMarketController.listings);
router.get('/portfolio', ShareMarketController.portfolio);
router.get('/my-orders', ShareMarketController.myOrders);
router.delete('/orders/:orderId', ShareMarketController.cancelOrder);

// ── DRX index + IPO pipeline (static paths first so they win over params) ──
router.get('/drx-index', IpoExchangeController.index);
router.get('/ipo/pipeline', IpoExchangeController.pipeline);
router.delete('/ipo/ioi/:ioiId', IpoExchangeController.cancelIoi);
router.get('/ipo/:companyId/eligibility', IpoExchangeController.eligibility);
router.post('/ipo/:companyId/file', IpoExchangeController.file);
router.post('/ipo/:companyId/withdraw', IpoExchangeController.withdraw);
router.post('/ipo/:ipoId/ioi', IpoExchangeController.submitIoi);
router.get('/ipo/:companyId', IpoExchangeController.companyIpo);

// ── Quote detail (OHLC / earnings) ──
router.get('/company/:companyId/ohlc', IpoExchangeController.ohlc);
router.get('/company/:companyId/earnings', IpoExchangeController.earnings);
router.get('/company/:companyId', IpoExchangeController.companyDetail);

// ── Per-company order book ──
router.get('/:companyId/book', ShareMarketController.orderBook);
router.get('/:companyId/trades', ShareMarketController.trades);
router.get('/:companyId/history', ShareMarketController.priceHistory);
router.post('/:companyId/orders', ShareMarketController.placeOrder);
router.post('/:companyId/ipo', ShareMarketController.ipoLaunch);

export default router;
