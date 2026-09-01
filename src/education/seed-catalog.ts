import type { CurriculumResource } from './curriculum.js';
import type { Grade } from './types.js';

export const seedCatalog: readonly CurriculumResource[] = [
  {
    resourceId: 'math-c-01',
    grade: 'C',
    subjectId: 'math',
    subjectLabel: 'Μαθηματικά',
    title: 'Μαθηματικά Γ΄ Δημοτικού',
    source: {
      attribution: 'ΥΠΑΝ Κύπρου — Μαθηματικά Δημοτικής Εκπαίδευσης',
      sourceUrl: 'https://mathd.schools.ac.cy/el/',
      usageType: 'official-link',
    },
    pages: [
      {
        pageId: 'math-c-01-p1',
        pageNumber: 1,
        title: 'Πρόσθεση και αφαίρεση',
        baseContent: { type: 'agnes', ref: 'agnes://math-c-01-p1' },
        activities: [
          {
            activityId: 'math-c-01-a1',
            kind: 'numeric',
            validationMode: 'exact',
            prompt: '24 + 13 =',
            expected: 37,
          },
        ],
      },
    ],
  },
  {
    resourceId: 'math-a-01',
    grade: 'A',
    subjectId: 'math',
    subjectLabel: 'Μαθηματικά',
    title: 'Μαθηματικά Α΄ Δημοτικού',
    source: {
      attribution: 'ΥΠΑΝ Κύπρου — Μαθηματικά Δημοτικής Εκπαίδευσης',
      sourceUrl: 'https://mathd.schools.ac.cy/el/',
      usageType: 'official-link',
    },
    pages: [
      {
        pageId: 'math-a-01-p1',
        pageNumber: 1,
        title: 'Μετρώ αντικείμενα',
        baseContent: { type: 'agnes', ref: 'agnes://math-a-01-p1' },
        activities: [
          {
            activityId: 'math-a-01-a1',
            kind: 'single-choice',
            validationMode: 'exact',
            prompt: 'Πόσα αντικείμενα βλέπεις;',
            expected: '3',
          },
        ],
      },
    ],
  },
];

export function getCatalogForGrade(grade: Grade): readonly CurriculumResource[] {
  return seedCatalog.filter((resource) => resource.grade === grade);
}

export function getPage(resourceId: string, pageId: string) {
  return seedCatalog
    .find((resource) => resource.resourceId === resourceId)
    ?.pages.find((page) => page.pageId === pageId);
}
