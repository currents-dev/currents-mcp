#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const pkg = require("./package.json");
const { Command } = require("commander");

const program = new Command()
  .name("publish")
  .option("-t, --tag <alpha | beta | latest>", "npm dist-tag to publish to");

program.parse(process.argv);
const options = program.opts();

console.log(options);
if (!options.tag) {
  console.log("No tag supplied: beta or latest");
  process.exit(1);
}
console.log(process.cwd());

fs.copyFileSync("../README.md", "./README.md");

pkg.devDependencies = {};
delete pkg["release-it"];

fs.writeFileSync("./package.json", JSON.stringify(pkg, null, 2));
execSync(`npm pack --dry-run && npm publish --tag ${options.tag}`, {
  cwd: "./",
  stdio: "inherit",
});
