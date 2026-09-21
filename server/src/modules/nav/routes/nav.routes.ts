import { Router } from 'express';
import { navCounterController } from '@modules/nav/controllers/NavCounterController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { validate } from '@shared/middleware/validationMiddleware';
import { MarkNavSeenInputSchema } from '@shared/contracts';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/nav/counters — Get per-destination unread counts for sidebar */
router.get('/counters', (req, res) => navCounterController.getCounters(req, res));

/** POST /api/v1/nav/seen — Mark a nav destination as seen */
router.post('/seen', validate(MarkNavSeenInputSchema), (req, res) => navCounterController.markSeen(req, res));

export default router;
