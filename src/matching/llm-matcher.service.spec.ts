import { ResourceStatus, Proficiency, SkillCategory } from '../database/enums';
import { parseRequirement } from './parse-requirement.util';
import { LlmClientService } from '../llm/llm-client.service';
import { LlmMatcherService } from './llm-matcher.service';

describe('LlmMatcherService', () => {
  const llm = {
    complete: jest.fn(),
  } as unknown as LlmClientService;

  const matcher = new LlmMatcherService(llm);

  const candidate = {
    employeeId: 1,
    employeeCode: 'EMP-001',
    fullName: 'Alex Dev',
    status: ResourceStatus.BENCH,
    department: 'Engineering',
    availableUtilizationPct: 100,
    skills: [
      {
        skillId: 10,
        skillName: 'NestJS',
        proficiency: Proficiency.ADVANCED,
      },
    ],
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('maps LLM JSON into ranked employee matches', async () => {
    (llm.complete as jest.Mock).mockResolvedValue(
      JSON.stringify({
        matches: [
          {
            employeeId: 1,
            score: 92,
            reasons: ['Strong NestJS experience'],
            matchedSkills: [{ skillId: 10, skillName: 'NestJS' }],
          },
        ],
      }),
    );

    const results = await matcher.rankMatches(
      [candidate],
      'Need a senior NestJS backend developer',
    );

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(92);
    expect(results[0].reasons[0]).toContain('NestJS');
    expect(results[0].matchedSkills[0].skillName).toBe('NestJS');
  });

  it('parses fenced JSON from LLM output', async () => {
    (llm.complete as jest.Mock).mockResolvedValue(
      '```json\n{"matches":[{"employeeId":1,"score":80,"reasons":["Fit"],"matchedSkills":[]}]}\n```',
    );

    const results = await matcher.rankMatches([candidate], 'backend dev');
    expect(results[0].score).toBe(80);
  });

  it('drops LLM matches that lack the requested technology', async () => {
    (llm.complete as jest.Mock).mockResolvedValue(
      JSON.stringify({
        matches: [
          {
            employeeId: 1,
            score: 20,
            reasons: ['Possesses BACKEND skill.'],
            matchedSkills: [{ skillId: 10, skillName: 'Node.js' }],
          },
        ],
      }),
    );

    const nodeCandidate = {
      ...candidate,
      skills: [
        {
          skillId: 10,
          skillName: 'Node.js',
          skillCategory: SkillCategory.BACKEND,
          proficiency: Proficiency.INTERMEDIATE,
        },
      ],
    };
    const parsed = parseRequirement('I need a coldfusion developer');

    const results = await matcher.rankMatches(
      [nodeCandidate],
      'I need a coldfusion developer',
      parsed,
    );

    expect(results).toHaveLength(0);
  });

  it('requires a non-empty query', async () => {
    await expect(matcher.rankMatches([candidate], '  ')).rejects.toThrow(
      'Natural language query is required',
    );
  });
});
