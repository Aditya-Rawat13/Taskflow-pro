const { Router } = require('express');
const { list, create, getById, update, updateStatus, remove } = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema, updateStatusSchema } = require('../validators/task.validator');

// mergeParams: true so :projectId from the parent router is accessible
const router = Router({ mergeParams: true });

// All task routes require authentication
router.use(authenticate);

// Task CRUD — list and getById are accessible to any project member
router.get('/', list);
router.post('/', requireRole('ADMIN'), validateBody(createTaskSchema), create);
router.get('/:taskId', getById);
router.put('/:taskId', requireRole('ADMIN'), validateBody(updateTaskSchema), update);
router.delete('/:taskId', requireRole('ADMIN'), remove);

// Status update — accessible to Admin or the task's assignee (enforced in controller)
router.patch('/:taskId/status', validateBody(updateStatusSchema), updateStatus);

module.exports = router;
