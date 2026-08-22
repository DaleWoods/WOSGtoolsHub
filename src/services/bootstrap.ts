import { env } from '../config/env.js';
import { createUser, countUsers } from './users.js';
import { createCategory, listCategories } from './categories.js';
import { createApp, countApps } from './apps.js';

const SEED_CATEGORIES: Array<{ name: string; accentColour: string }> = [
  { name: 'QA Tools', accentColour: '#4f46e5' },
  { name: 'Commercial Tools', accentColour: '#059669' },
];

const SEED_APPS: Array<{ name: string; description: string; category: string; icon: string }> = [
  {
    name: 'Competitor Price Scraper',
    description: 'Tracks competitor pricing across key product lines.',
    category: 'Commercial Tools',
    icon: '📈',
  },
  {
    name: 'Business Impact Scoring App',
    description: 'Scores the business impact of proposed changes.',
    category: 'Commercial Tools',
    icon: '💼',
  },
  {
    name: 'QA PDP/Web Scanner',
    description: 'Scans PDP and web pages for QA issues.',
    category: 'QA Tools',
    icon: '🔍',
  },
  {
    name: 'Ticket Rank Lookup',
    description: 'Looks up ticket ranking information.',
    category: 'QA Tools',
    icon: '🎫',
  },
];

export async function bootstrapFirstAdmin(): Promise<void> {
  const userCount = await countUsers();
  if (userCount > 0) return;

  if (!env.adminUsername || !env.adminPassword) {
    console.warn(
      'Users table is empty but ADMIN_USERNAME/ADMIN_PASSWORD are not set — skipping first-admin bootstrap.',
    );
    return;
  }

  await createUser(env.adminUsername, env.adminPassword, 'admin');
  console.log(`Bootstrapped first admin account: ${env.adminUsername}`);
}

export async function seedCategoriesAndApps(): Promise<void> {
  const existingCategories = await listCategories();
  const nameToId = new Map(existingCategories.map((c) => [c.name, c.id]));

  for (const seed of SEED_CATEGORIES) {
    if (!nameToId.has(seed.name)) {
      const created = await createCategory(seed.name, seed.accentColour);
      nameToId.set(created.name, created.id);
    }
  }

  const appCount = await countApps();
  if (appCount > 0) return;

  for (const seed of SEED_APPS) {
    const categoryId = nameToId.get(seed.category);
    if (!categoryId) continue;
    await createApp({
      name: seed.name,
      description: seed.description,
      url: '',
      icon: seed.icon,
      categoryId,
      status: 'live',
      notes: null,
      visibility: 'all',
      isActive: true,
    });
  }
  console.log('Seeded placeholder categories and apps.');
}
