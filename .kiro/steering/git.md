---
inclusion: always
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 

# Conventional Commits — Steering Guide

## 📌 Overview

**Conventional Commits** is a lightweight specification for writing standardized commit messages. It creates a common convention that is both **human- and machine-readable**, enabling clearer commit history and better automation (e.g., versioning, CHANGELOG generation). ([conventionalcommits.org][1])

This guide combines the *official specification* with practical insights from an engineering team on how to apply the pattern effectively.

---

## 🧱 Commit Message Structure

The basic structure of a Conventional Commit message is:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

* **type**: Defines the kind of change being committed.
* **scope** (*optional*): A context or section of the codebase it affects.
* **description**: A short imperative summary of the change.
* **body** (*optional*): Additional explanatory text.
* **footer(s)** (*optional*): Metadata like issue references or breaking changes. ([conventionalcommits.org][1])

---

## 🔠 Commit Types

Commonly used types include:

| Type       | Meaning                                               |
| ---------- | ----------------------------------------------------- |
| `feat`     | A new feature                                         |
| `fix`      | A bug fix                                             |
| `docs`     | Documentation only changes                            |
| `style`    | Formatting, whitespace, or code style changes         |
| `refactor` | Code changes that neither add a feature nor fix a bug |
| `perf`     | A performance improvement                             |
| `test`     | Adding or updating tests                              |
| `ci`       | Changes to CI configuration                           |
| `build`    | Changes that affect the build system or dependencies  |
| `chore`    | Maintenance tasks / tooling updates                   |
| `revert`   | Reverting a previous commit                           |

> The specification **allows additional types** beyond these, if your team defines them. ([conventionalcommits.org][1])

**Notes derived from real use:**

* Only **one type per commit** is allowed.
* If unsure which type fits best, consider splitting the work into multiple commits.
* Teams often include custom types if needed (e.g., `business` for business-rule adjustments). ([Medium][2])

---

## 🔍 Scopes

Scopes provide extra detail about where the change occurred:

* Written inside parentheses after the type (e.g., `feat(parser): ...`).
* They help describe **what part of the codebase** the commit touches.
* Multiple scopes can be used if the change affects several areas. ([Medium][2])

---

## ✨ Description Style

The description (subject) should be:

* **Brief** — summarize in imperative voice.
* In the **imperative mood** (e.g., “add feature”, not “added feature”).
* Based on the idea:

  > *“If applied, this commit will…”*
  > This makes commit intent clearer to humans and tools. ([Medium][2])

---

## ⚠️ Breaking Changes

A commit introduces a breaking change when:

1. The commit header includes a `!`:

   ```
   feat!: change API behavior
   ```
2. It uses a footer with `BREAKING CHANGE: …`

Breaking changes should correlate with a **MAJOR** version bump in semantic versioning. ([conventionalcommits.org][1])

---

## 🧠 Semantic Versioning (SemVer)

The Conventional Commits specification connects to SemVer:

| Commit Type/Indicator | Version Impact |
| --------------------- | -------------- |
| `fix`                 | PATCH          |
| `feat`                | MINOR          |
| `BREAKING CHANGE`     | MAJOR          |

This linkage allows version bump automation based purely on commit content. ([conventionalcommits.org][1])

---

## 📋 Practical Benefits

Using Conventional Commits helps with:

* **Automating changelog generation**
* **Inferring version bumps**
* **Improved transparency for collaborators**
* **Better CI/CD triggers and tooling**
* **Easier onboarding and history exploration** ([conventionalcommits.org][3])

---

## 🛠 Adoption Tips

* Use commit linters or tools (like *commitlint*) to enforce the standard in CI. ([Medium][2])
* Educate your team on the rule set and why it matters.
* Customize commit types and workflows only if aligned with team goals.
* Consider automated tooling that reads commit history for release automation.

---

## 📚 Examples

### Standard commit

```
feat(parser): add support for bracket syntax
```

### With scope and breaking change

```
feat(parser)!: remove deprecated parse API

BREAKING CHANGE: The previous parse API has been removed.
```

### With body and footer

```
fix(cache): resolve stale cache invalidation issue

The cache did not correctly refresh when TTL expired.
Refs #321
Reviewed-by: @alice
```

---

## 🧩 Summary of Best Practices

* Follow the **structure strictly** for predictable history.
* Use **imperative language** in commit subjects.
* Prefer **single logical change per commit**.
* Use **scopes** for context in larger codebases.
* Track **breaking changes clearly** for automation.

---
