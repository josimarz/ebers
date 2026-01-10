---
inclusion: always
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 

# Conventional Commits & Conventional Branches — Steering Guide

This document combines the **Conventional Commits specification** with **branch naming best practices** to help you maintain **clear, consistent, and automation-friendly** Git history and workflows.

---

## 📌 Overview

**Conventional Commits** defines a structured format for commit messages that supports **semver versioning, automation, and readability**.
**Conventional Branches** extends that structure to Git branch names, helping teams and tools identify the purpose of branches quickly. ([Conventional Branch][1])

---

## 🧱 Conventional Commit Messages

### Structure

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

* `type`: Category of change (feat, fix, etc.).
* `scope` (optional): Area of code affected.
* `description`: Imperative summary.
* `body`: Optional detailed explanation.
* `footer`: Metadata (issues references, breaking changes).

---

### Common Types

| Type                   | Purpose                               |
| ---------------------- | ------------------------------------- |
| `feat`                 | New feature                           |
| `fix`                  | Bug fix                               |
| `docs`                 | Documentation                         |
| `style`                | Formatting or stylistic changes       |
| `refactor`             | Code modification without feature/fix |
| `perf`                 | Performance improvements              |
| `test`                 | Tests added or modified               |
| `ci`                   | CI config changes                     |
| `build`                | Build system / dependencies changes   |
| `chore`                | Maintenance tasks                     |
| `revert`               | Revert a previous commit              |
| (*Extendable by team*) |                                       |

---

### Best Practices for Messages

1. **Use imperative mood**: e.g., *“add login”*, not *“added login”*.
2. **Include a scope when meaningful**: improves context.
3. **Keep description concise** (≤72 characters).
4. **Use body for motivation/impact**.
5. **Use footer for breaking changes and ticket refs**.

---

## 🌿 Conventional Branch Naming

Standardizing branch names improves readability, tooling integration (CI/CD workflows), and collaboration. ([Conventional Branch][1])

### Naming Format

```
<type>/<description>
```

### Common Prefix Types

| Prefix                                                    | Purpose                   |
| --------------------------------------------------------- | ------------------------- |
| `main`                                                    | Base code branch          |
| `feature/`                                                | New features              |
| `bugfix/` or `fix/`                                       | Bug fixes                 |
| `hotfix/`                                                 | Critical production fixes |
| `release/`                                                | Release preparation       |
| `chore/`                                                  | Maintenance tasks         |
| (*Teams may extend if needed*) ([Conventional Branch][1]) |                           |

---

### Basic Rules

1. **Lowercase only** — avoid uppercase; Git branch search is case-sensitive. ([DEV Community][2])
2. **Use hyphens (`-`) to separate words.**
3. **No consecutive or trailing hyphens or dots.** ([Conventional Branch][1])
4. **Clear and concise descriptions** that signal intent. ([Conventional Branch][1])
5. **Include issue/ticket numbers** (if applicable) for traceability. ([Conventional Branch][1])

**Examples**

```
feature/user-authentication
bugfix/issue-234-fix-login-error
hotfix/critical-security-patch
release/v1.2.0
chore/update-dependencies
```

---

## 🧠 Branching Best Practices

### 🎯 Branch Creation

* **Branch off from latest `main` or stable base** to reduce merge conflicts.
* **Keep branches focused on a single task** (feature, fix, chore).
* **Delete merged branches** to avoid clutter. ([docs.tuturuuu.com][3])

---

### 📌 Naming Clarity

* Use **purpose-first prefixes** (e.g., `feature/`, `bugfix/`).
* **Avoid vague names** like `new`, `update`, or `work`.
* Include **ticket identifiers** when using issue trackers.
* Avoid embedding developer names; branches should represent *work, not person*. ([Conventional Branch][1])

---

### 🔁 Workflow Considerations

* **Short-lived branches** are healthier than long-lived ones:
  they reduce conflicts and keep integration frequent.
* **Rename branches** if the scope significantly changes (but coordinate with the team).
* Use **CI enforcement (hooks/lint)** to validate branch names consistently. ([theadnanlab.com][4])

---

## 🔄 Integrating Commits & Branches

Aligning conventional commits with branch names increases clarity:

* Branch `feature/login` → commits like `feat(login): …`.
* Branch `bugfix/234-fix-header` → commits like `fix(header): …`.

This **mapping enhances traceability** and improves automated release tools.

---

## 🛠 Automation & Tooling

Use automated tools to enforce conventions:

* **Commit message linters** (e.g., `commitlint`).
* **Branch name validators** (e.g., Git hooks, CI scripts).
* **Semantic release tools** that parse commit history for versioning.

Conventions make automation reliable and predictable.

---

## 📚 Summary

Following Conventional Commits and Conventional Branches ensures:

* **Consistent commit and branch history**.
* **Improved readability and collaboration**.
* **Better tooling support** (automated versioning, changelogs, CI).
* **Related semantic context** between code changes and branches.

By adopting and enforcing these conventions, teams build a **clear, cohesive, and maintainable workflow**.

---
