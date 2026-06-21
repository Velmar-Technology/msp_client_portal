import { Router } from 'express';
import { subscriptionController } from '../controllers/SubscriptionController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { CreateSubscriptionDTO, UpdateSubscriptionDTO } from '../dtos/subscription.dto';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/subscriptions — List client subscriptions */
router.get('/', (req, res) => subscriptionController.getAll(req, res));

/** GET /api/v1/subscriptions/:id — Get subscription details */
router.get('/:id', (req, res) => subscriptionController.getById(req, res));

/** POST /api/v1/subscriptions — Create a subscription */
router.post('/', validate(CreateSubscriptionDTO), (req, res) => subscriptionController.create(req, res));

/** PATCH /api/v1/subscriptions/:id — Update subscription */
router.patch('/:id', validate(UpdateSubscriptionDTO), (req, res) => subscriptionController.update(req, res));

export default router;
