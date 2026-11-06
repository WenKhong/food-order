import type { Category } from '@/lib/schemas/menu';

// How each category is labelled on the menu page.
export const CATEGORY_INFO: Record<Category, { label: string; emoji: string }> = {
  pizza: { label: 'Pizza', emoji: '🍕' },
  pasta: { label: 'Pasta', emoji: '🍝' },
  sides: { label: 'Sides', emoji: '🍟' },
  drinks: { label: 'Drinks', emoji: '🥤' },
  desserts: { label: 'Desserts', emoji: '🍰' },
};
