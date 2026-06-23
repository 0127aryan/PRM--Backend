import { parseRequirement } from './parse-requirement.util';
import { extractQueryKeywords } from './query-keywords.util';

describe('extractQueryKeywords', () => {
  it('extracts skill tokens from natural language', () => {
    const keywords = extractQueryKeywords(
      'Backend developer with Java and microservices, 6 months',
    );
    expect(keywords).toContain('java');
    expect(keywords).toContain('microservices');
    expect(
      parseRequirement(
        'Backend developer with Java and microservices, 6 months',
      ).skillCategories,
    ).toContain('BACKEND');
  });
});
