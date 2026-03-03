import { Router } from 'express';
import { CoursesController } from '../controllers/courses.controller';
import { authenticate } from '../middleware/auth';
import { validateCourseCreate, validateCourseUpdate, validateUUIDParam } from '../middleware/validate.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/courses
 * @desc    Get all courses with pagination, filtering, and search
 * @access  Private (all authenticated users)
 */
router.get('/', CoursesController.list);

/**
 * @route   GET /api/courses/:id
 * @desc    Get a single course by ID
 * @access  Private (all authenticated users)
 */
router.get('/:id', validateUUIDParam(), CoursesController.getById);

/**
 * @route   GET /api/courses/:id/offerings
 * @desc    Get all offerings for a specific course
 * @access  Private (all authenticated users)
 */
router.get('/:id/offerings', validateUUIDParam(), CoursesController.getOfferings);

/**
 * @route   POST /api/courses
 * @desc    Create a new course
 * @access  Private (admin, department_head)
 */
router.post('/', validateCourseCreate, CoursesController.create);

/**
 * @route   PUT /api/courses/:id
 * @desc    Update a course
 * @access  Private (admin, department_head)
 */
router.put('/:id', validateCourseUpdate, CoursesController.update);

/**
 * @route   DELETE /api/courses/:id
 * @desc    Delete a course
 * @access  Private (admin, department_head)
 */
router.delete('/:id', validateUUIDParam(), CoursesController.delete);

export default router;
