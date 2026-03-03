import { Router } from 'express';
import { OfferingsController } from '../controllers/offerings.controller';
import { authenticate, checkPermission } from '../middleware/auth.middleware';
import { validateOfferingCreate, validateOfferingUpdate, validateUUIDParam, validatePagination } from '../middleware/validate.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List course offerings - view permission
router.get(
  '/',
  checkPermission('offerings', 'view'),
  validatePagination,
  OfferingsController.list
);

// Get offering by ID - view permission
router.get(
  '/:id',
  checkPermission('offerings', 'view'),
  validateUUIDParam(),
  OfferingsController.getById
);

// Create course offering - create permission
router.post(
  '/',
  checkPermission('offerings', 'create'),
  validateOfferingCreate,
  OfferingsController.create
);

// Update course offering - update permission
router.put(
  '/:id',
  checkPermission('offerings', 'update'),
  validateUUIDParam(),
  validateOfferingUpdate,
  OfferingsController.update
);

// Delete course offering - delete permission
router.delete(
  '/:id',
  checkPermission('offerings', 'delete'),
  validateUUIDParam(),
  OfferingsController.delete
);

// Get offerings by term - view permission
router.get(
  '/term/:termId',
  checkPermission('offerings', 'view'),
  validateUUIDParam('termId'),
  OfferingsController.getByTerm
);

// Get offerings by course - view permission
router.get(
  '/course/:courseId',
  checkPermission('offerings', 'view'),
  validateUUIDParam('courseId'),
  OfferingsController.getByCourse
);

// Update offering schedule - update permission
router.patch(
  '/:id/schedule',
  checkPermission('offerings', 'update'),
  validateUUIDParam(),
  OfferingsController.updateSchedule
);

export default router;
