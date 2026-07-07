import { Router } from 'express';
import { ShareMarketController } from '../controllers/shareMarket.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/listings', ShareMarketController.listings);
router.get('/portfolio', ShareMarketController.portfolio);
router.get('/my-orders', ShareMarketController.myOrders);
router.delete('/orders/:orderId', ShareMarketController.cancelOrder);
router.get('/:companyId/book', ShareMarketController.orderBook);
router.get('/:companyId/trades', ShareMarketController.trades);
router.get('/:companyId/history', ShareMarketController.priceHistory);
router.post('/:companyId/orders', ShareMarketController.placeOrder);
router.post('/:companyId/ipo', ShareMarketController.ipoLaunch);

export default router;
