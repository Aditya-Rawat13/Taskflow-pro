const { Router } = require('express');
const {
  list,
  create,
  getById,
  update,
  remove,
  listMembers,
  addMember,
  removeMember,
} = require('../controllers/project.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validate');
const {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
} = require('../validators/project.validator');

const router = Router();

// All project routes require authentication
router.use(authenticate);

// Project CRUD
router.get('/', list);
router.post('/', validateBody(createProjectSchema), create);
router.get('/:projectId', getById);
router.put('/:projectId', requireRole('ADMIN'), validateBody(updateProjectSchema), update);
router.delete('/:projectId', requireRole('ADMIN'), remove);

// Member management — all require ADMIN except GET (any member)
router.get('/:projectId/members', listMembers);
router.post('/:projectId/members', requireRole('ADMIN'), validateBody(addMemberSchema), addMember);
router.delete('/:projectId/members/:memberId', requireRole('ADMIN'), removeMember);

module.exports = router;
