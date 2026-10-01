import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { getSkills, skillFileUri } from './skills';
import {
  skillCatalog,
  skillEntry,
  skillFileDigest,
  skillFrontmatter,
} from './skillsExtension';

describe('skillFrontmatter', () => {
  it('reads every single-line field', () => {
    expect(
      skillFrontmatter('---\nname: a\ndescription: b c\nlicense: MIT\n---\n# A')
    ).toEqual({ name: 'a', description: 'b c', license: 'MIT' });
  });

  it('accepts CRLF and blank lines inside the block', () => {
    expect(
      skillFrontmatter('---\r\nname: a\r\n\r\ndescription: b\r\n---')
    ).toEqual({ name: 'a', description: 'b' });
  });

  // A host compares the catalog's frontmatter field by field with what it
  // parses from the file, so a field this cannot represent must not ship.
  it.each([
    ['a nested value', '---\nname: a\nmetadata:\n  team: x\n---'],
    ['a block scalar', '---\nname: a\ndescription: |\n  long\n---'],
    ['a list item', '---\nname: a\n- item\n---'],
    ['no block at all', '# no frontmatter'],
  ])('rejects %s', (_, source) => {
    expect(() => skillFrontmatter(source)).toThrow();
  });
});

describe('skillEntry', () => {
  const skill = {
    name: 'demo',
    description: 'd',
    files: [
      { path: 'references/x.md', content: 'ref' },
      {
        path: 'SKILL.md',
        content: '---\nname: demo\ndescription: d\n---\nbody',
      },
    ],
  };

  it('points at SKILL.md and lists every file with its digest and size', () => {
    const entry = skillEntry(skill);
    expect(entry.uri).toBe('skill://currents/demo/SKILL.md');
    expect(entry.frontmatter).toEqual({ name: 'demo', description: 'd' });
    expect(entry.resources).toEqual([
      {
        uri: 'skill://currents/demo/references/x.md',
        digest: skillFileDigest('ref'),
        size: 3,
      },
      {
        uri: 'skill://currents/demo/SKILL.md',
        digest: skillFileDigest(skill.files[1].content),
        size: Buffer.byteLength(skill.files[1].content),
      },
    ]);
  });

  it('digests the UTF-8 bytes as sha256:<64 lowercase hex>', () => {
    const content = 'héllo';
    expect(skillFileDigest(content)).toBe(
      `sha256:${createHash('sha256').update(Buffer.from(content, 'utf8')).digest('hex')}`
    );
    expect(skillFileDigest(content)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('sizes in bytes, not characters', () => {
    const entry = skillEntry({
      ...skill,
      files: [
        { path: 'SKILL.md', content: '---\nname: demo\ndescription: é\n---' },
      ],
    });
    expect(entry.resources[0].size).toBe(
      Buffer.byteLength('---\nname: demo\ndescription: é\n---')
    );
  });
});

describe('the shipped catalog', () => {
  it('has an entry per skill, whose uri ends in the skill name and SKILL.md', () => {
    const catalog = skillCatalog();
    expect(catalog.map((e) => e.uri)).toEqual(
      getSkills().map((s) => skillFileUri(s.name, 'SKILL.md'))
    );
    for (const entry of catalog) {
      const name = entry.frontmatter.name;
      expect(entry.uri).toBe(`skill://currents/${name}/SKILL.md`);
    }
  });

  it('carries the name and description the host lists a skill by', () => {
    for (const [skill, entry] of getSkills().map(
      (s, i) => [s, skillCatalog()[i]] as const
    )) {
      expect(entry.frontmatter.name).toBe(skill.name);
      expect(entry.frontmatter.description).toBe(skill.description);
    }
  });

  it('lists SKILL.md itself among the resources, and nothing twice', () => {
    for (const entry of skillCatalog()) {
      const uris = entry.resources.map((r) => r.uri);
      expect(uris).toContain(entry.uri);
      expect(new Set(uris).size).toBe(uris.length);
    }
  });
});
