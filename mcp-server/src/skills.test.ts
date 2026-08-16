import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { skillFileUri, skills } from "./skills.js";

describe("skills manifest", () => {
  it("inlines at least one skill", () => {
    expect(skills.length).toBeGreaterThan(0);
  });

  describe.each(skills)("$name", (skill) => {
    it("has a SKILL.md entry point", () => {
      expect(skill.files.map((f) => f.path)).toContain("SKILL.md");
    });

    it("has a description", () => {
      expect(skill.description.length).toBeGreaterThan(0);
    });

    it("inlines the content of every file", () => {
      for (const file of skill.files) {
        expect(file.content.length, `${file.path} is empty`).toBeGreaterThan(0);
      }
    });

    it("references only files that ship with the skill", () => {
      const shipped = new Set(skill.files.map((f) => f.path));
      const entryPoint = skill.files.find((f) => f.path === "SKILL.md");
      const linked = [
        ...(entryPoint?.content.matchAll(/\]\((references\/[\w./-]+)\)/g) ?? []),
      ].map((m) => m[1]);
      const missing = linked.filter((path) => !shipped.has(path));
      expect(missing, `linked but not shipped: ${missing.join(", ")}`).toEqual(
        []
      );
    });
  });
});

describe("skill resource URIs", () => {
  it("builds a skill:// URI per file", () => {
    expect(skillFileUri("collect-ci-evidence", "SKILL.md")).toBe(
      "skill://currents/collect-ci-evidence/SKILL.md"
    );
  });
});

describe("README.md skills table", () => {
  const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf-8");
  const skillNamesInReadme = [
    ...readme.matchAll(/\| \[`([\w-]+)`\]\(skills\//g),
  ].map((m) => m[1]);

  it("every skill is listed in README", () => {
    const missing = skills
      .map((s) => s.name)
      .filter((name) => !skillNamesInReadme.includes(name));
    expect(missing, `skills missing from README: ${missing.join(", ")}`).toEqual(
      []
    );
  });

  it("README does not list removed skills", () => {
    const names = skills.map((s) => s.name);
    const stale = skillNamesInReadme.filter((name) => !names.includes(name));
    expect(stale, `stale skills in README: ${stale.join(", ")}`).toEqual([]);
  });
});
