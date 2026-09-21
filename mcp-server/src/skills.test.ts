import { describe, expect, it } from 'vitest';
import {
  FILE_CLOSE_TAG,
  getSkills,
  skillDocument,
  skillFileUri,
  type Skill,
} from './skills';

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

    // `skillDocument` writes each file into a `<file path="...">` block. A
    // path holding a quote or a bracket, or content holding the closing tag,
    // makes the boundary ambiguous to the model and fails nowhere else.
    it('holds nothing that would break a file block', () => {
      for (const file of skill.files) {
        expect(file.path).not.toMatch(/["<>]/);
        expect(file.content, `${file.path}`).not.toContain(FILE_CLOSE_TAG);
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

describe('skillDocument', () => {
  const skill = (files: Skill['files']): Skill => ({
    name: 'test-skill',
    description: 'a skill',
    files,
  });

  // Built with the references first, which is the order `getSkills` returns
  // on a machine whose collation sorts `references/` ahead of `SKILL.md`.
  it('leads with the entry point and keeps the rest in order', () => {
    const document = skillDocument(
      skill([
        { path: 'references/a.md', content: 'A' },
        { path: 'references/b.md', content: 'B' },
        { path: 'SKILL.md', content: 'the workflow' },
      ])
    );

    expect(
      [...document.matchAll(/<file path="([^"]+)">/g)].map((m) => m[1])
    ).toEqual(['SKILL.md', 'references/a.md', 'references/b.md']);
  });

  it('carries the content of every file', () => {
    const document = skillDocument(
      skill([
        { path: 'SKILL.md', content: 'the workflow' },
        { path: 'references/a.md', content: 'the appendix' },
      ])
    );

    expect(document).toContain('the workflow');
    expect(document).toContain('the appendix');
  });

  it('serves a skill that has no references', () => {
    const document = skillDocument(
      skill([{ path: 'SKILL.md', content: 'the workflow' }])
    );

    expect(document).toBe('<file path="SKILL.md">\nthe workflow\n</file>');
  });
});
