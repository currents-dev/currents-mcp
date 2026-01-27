#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
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

// Copy README from root - remove symlink first if it exists
const readmePath = "./README.md";
try {
  const stat = fs.lstatSync(readmePath);
  if (stat.isSymbolicLink()) {
    console.log("Removing README.md symlink...");
    fs.unlinkSync(readmePath);
  }
} catch (err) {
  // File doesn't exist, that's fine
}

console.log("Copying README.md from root...");
fs.copyFileSync("../README.md", readmePath);

// Verify README was copied
const readmeContent = fs.readFileSync(readmePath, "utf-8");
console.log(`README.md copied (${readmeContent.length} bytes)`);

pkg.devDependencies = {};
delete pkg["release-it"];

fs.writeFileSync("./package.json", JSON.stringify(pkg, null, 2));
execSync(`npm pack --dry-run && npm publish --tag ${options.tag}`, {
  cwd: "./",
  stdio: "inherit",
});
