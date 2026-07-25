import { parseRequirement } from './parse-requirement.util';

/** @deprecated Use parseRequirement() for structured filters. */
export function extractQueryKeywords(text: string): string[] {
  return parseRequirement(text).keywords;
}
