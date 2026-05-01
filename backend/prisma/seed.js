const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Hash password for all users (same password for simplicity: "Password1")
  const passwordHash = await bcrypt.hash('Password1', 12);

  // Create four professional users
  const alice = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@taskflowpro.dev',
      password: passwordHash,
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob Martinez',
      email: 'bob@taskflowpro.dev',
      password: passwordHash,
    },
  });

  const carol = await prisma.user.create({
    data: {
      name: 'Carol Chen',
      email: 'carol@taskflowpro.dev',
      password: passwordHash,
    },
  });

  const david = await prisma.user.create({
    data: {
      name: 'David Kim',
      email: 'david@taskflowpro.dev',
      password: passwordHash,
    },
  });

  console.log('Created users:', alice.name, bob.name, carol.name, david.name);

  // Create two projects
  const projectAlpha = await prisma.project.create({
    data: {
      name: 'Project Alpha',
      description: 'A flagship product redesign initiative to modernize the user experience.',
      ownerId: alice.id,
    },
  });

  const projectBeta = await prisma.project.create({
    data: {
      name: 'Project Beta',
      description: 'Internal tooling improvements to streamline developer workflows.',
      ownerId: bob.id,
    },
  });

  console.log('Created projects:', projectAlpha.name, projectBeta.name);

  // Create memberships for Project Alpha
  // Alice is owner → ADMIN
  await prisma.projectMember.create({
    data: { projectId: projectAlpha.id, userId: alice.id, role: 'ADMIN' },
  });
  // Bob is MEMBER
  await prisma.projectMember.create({
    data: { projectId: projectAlpha.id, userId: bob.id, role: 'MEMBER' },
  });
  // Carol is MEMBER
  await prisma.projectMember.create({
    data: { projectId: projectAlpha.id, userId: carol.id, role: 'MEMBER' },
  });

  // Create memberships for Project Beta
  // Bob is owner → ADMIN
  await prisma.projectMember.create({
    data: { projectId: projectBeta.id, userId: bob.id, role: 'ADMIN' },
  });
  // Carol is ADMIN
  await prisma.projectMember.create({
    data: { projectId: projectBeta.id, userId: carol.id, role: 'ADMIN' },
  });
  // David is MEMBER
  await prisma.projectMember.create({
    data: { projectId: projectBeta.id, userId: david.id, role: 'MEMBER' },
  });

  console.log('Created memberships');

  const now = new Date();
  const future = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Create ten tasks — five per project
  // Project Alpha tasks
  await prisma.task.create({
    data: {
      title: 'Design new landing page mockups',
      description: 'Create high-fidelity Figma mockups for the redesigned landing page.',
      status: 'DONE',
      priority: 'HIGH',
      dueDate: future(5),
      projectId: projectAlpha.id,
      assigneeId: carol.id,
      createdById: alice.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Implement responsive navigation component',
      description: 'Build the new top navigation bar with mobile-first responsive design.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: future(10),
      projectId: projectAlpha.id,
      assigneeId: bob.id,
      createdById: alice.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Write user onboarding copy',
      description: 'Draft and review all copy for the new user onboarding flow.',
      status: 'IN_REVIEW',
      priority: 'MEDIUM',
      dueDate: future(14),
      projectId: projectAlpha.id,
      assigneeId: carol.id,
      createdById: alice.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Set up analytics tracking',
      description: 'Integrate event tracking for key user interactions on the new pages.',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: future(21),
      projectId: projectAlpha.id,
      assigneeId: bob.id,
      createdById: alice.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Conduct accessibility audit',
      description: 'Run WCAG 2.1 AA compliance checks across all redesigned pages.',
      status: 'TODO',
      priority: 'LOW',
      dueDate: future(30),
      projectId: projectAlpha.id,
      assigneeId: null,
      createdById: alice.id,
    },
  });

  // Project Beta tasks
  await prisma.task.create({
    data: {
      title: 'Automate deployment pipeline',
      description: 'Set up GitHub Actions CI/CD pipeline for automated testing and deployment.',
      status: 'DONE',
      priority: 'HIGH',
      dueDate: future(3),
      projectId: projectBeta.id,
      assigneeId: bob.id,
      createdById: bob.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Migrate legacy scripts to TypeScript',
      description: 'Convert all internal tooling scripts from JavaScript to TypeScript.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      dueDate: future(12),
      projectId: projectBeta.id,
      assigneeId: david.id,
      createdById: bob.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Document internal API endpoints',
      description: 'Write OpenAPI 3.0 documentation for all internal service endpoints.',
      status: 'IN_REVIEW',
      priority: 'MEDIUM',
      dueDate: future(18),
      projectId: projectBeta.id,
      assigneeId: carol.id,
      createdById: carol.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Upgrade Node.js to LTS version',
      description: 'Update all services to the latest Node.js LTS release and resolve breaking changes.',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: future(25),
      projectId: projectBeta.id,
      assigneeId: david.id,
      createdById: bob.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Add structured logging to all services',
      description: 'Integrate a structured JSON logger (e.g. pino) across all backend services.',
      status: 'TODO',
      priority: 'LOW',
      dueDate: future(35),
      projectId: projectBeta.id,
      assigneeId: null,
      createdById: carol.id,
    },
  });

  console.log('Created 10 tasks');
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
