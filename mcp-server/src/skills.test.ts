import { describe, expect, it } from 'vitest';
import { getSkills, skillFileUri } from './skills';

describe('skills manifest', () => {
  it('inlines at least one skill', () => {
    expect(getSkills().length).toBeGreaterThan(0);
  });

  describe.each(getSkills())('$name', (skill) => {
    it('has a SKILL.md entry point', () => {
      expect(skill.files.map((f) => f.path)).toContain('SKILL.md');
    });

    it('has a description', () => {
      expect(skill.description.length).toBeGreaterThan(0);
    });

    it('inlines the content of every file', () => {
      for (const file of skill.files) {
        expect(file.content.length, `${file.path} is empty`).toBeGreaterThan(0);
      }
    });

    it('references only files that ship with the skill', () => {
      const shipped = new Set(skill.files.map((f) => f.path));
      const entryPoint = skill.files.find((f) => f.path === 'SKILL.md');
      const linked = [
        ...(entryPoint?.content.matchAll(/\]\((references\/[\w./-]+)\)/g) ??
          []),
      ].map((m) => m[1]);
      const missing = linked.filter((path) => !shipped.has(path));
      expect(missing, `linked but not shipped: ${missing.join(', ')}`).toEqual(
        []
      );
    });
  });
});

describe('skill resource URIs', () => {
  it('builds a skill:// URI per file', () => {
    expect(skillFileUri('collect-evidence', 'SKILL.md')).toBe(
      'skill://currents/collect-evidence/SKILL.md'
    );
  });
});
