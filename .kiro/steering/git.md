---
inclusion: always
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 

# Git Best Practices  
**Commits · Branch Naming · Pull Requests (with GitHub CLI)**

This document defines a practical and complete standard for working with Git in a professional environment. It is designed for both humans and automation (CI/CD, changelog generators, release tools, and AI systems).

It is based on widely adopted conventions such as Conventional Commits, Conventional Branches, and collaborative code-review practices.

---

## 1. Commit Message Best Practices

All commits **must follow the Conventional Commits format**.

### 1.1 Format

```

<type>[optional scope]: <short description>

[optional body]

[optional footer(s)]

```

### 1.2 Types

Use these standardized types:

| Type       | Purpose                                                   |
|------------|-----------------------------------------------------------|
| `feat`     | A new feature                                             |
| `fix`      | A bug fix                                                 |
| `docs`     | Documentation changes only                               |
| `style`    | Formatting, whitespace, no logic changes                  |
| `refactor` | Code change that neither fixes a bug nor adds a feature   |
| `perf`     | Performance improvements                                 |
| `test`     | Adding or updating tests                                  |
| `build`    | Build system or dependency changes                        |
| `ci`       | CI/CD configuration changes                               |
| `chore`    | Maintenance tasks                                         |

### 1.3 Rules

- Use the **imperative mood** in the subject line:
  - Good: `fix: handle null user in auth middleware`
  - Bad: `fixed auth middleware`
- Keep the subject line **short (≤ 72 chars)**.
- Be **specific and descriptive**.
- Use a **scope** when it adds clarity.
- Use the **body** to explain *why* the change exists.
- Use **footers** for:
  - Breaking changes
  - Issue references (`Refs: #123`)

### 1.4 Examples

**Simple commit**
```

feat: add user profile page

```

**With scope**
```

fix(auth): prevent token refresh loop

```

**With body**
```

refactor(api): extract pagination logic

The pagination logic was duplicated across three endpoints.
This change centralizes it in a shared helper.

```

**Breaking change**
```

feat(config): replace YAML with TOML

BREAKING CHANGE: configuration files must now use .toml format.

```

---

## 2. Branch Naming Conventions

Branches must clearly communicate **intent and scope**.

### 2.1 Format

```

<prefix>/<short-description>

```

- Use **lowercase**
- Use **hyphens** (`-`) instead of spaces or underscores
- Keep names **short and meaningful**

### 2.2 Prefixes

| Prefix     | Purpose                     |
|------------|-----------------------------|
| `feature`  | New functionality            |
| `bugfix`   | Bug fixes                    |
| `hotfix`   | Urgent production fixes      |
| `release`  | Release preparation          |
| `docs`     | Documentation work           |
| `chore`    | Maintenance tasks            |

### 2.3 Examples

```

feature/user-authentication
feature/payment-webhooks
bugfix/fix-login-redirect
hotfix/critical-null-pointer
release/v1.4.0
docs/api-auth-guide
chore/update-dependencies

```

### 2.4 With Ticket Numbers (Optional)

```

feature/JIRA-231-add-password-reset
bugfix/PROJ-88-fix-timezone-bug

```

---

## 3. Pull Request Best Practices

Pull Requests (PRs) are the main collaboration and review mechanism.  
They must be **clear, focused, and respectful of reviewers’ time**.

All PRs in this workflow are created using **GitHub CLI (`gh`)**.

### 3.1 Scope Rules

- A PR should solve **one problem**.
- Do not mix:
  - Refactors + features
  - Formatting + logic changes
  - Multiple unrelated fixes

If changes are conceptually different, split them into multiple PRs.

### 3.2 Title

Use a clear, action-oriented title:

- `Add password reset flow`
- `Fix race condition in cache layer`
- `Refactor email service`

Avoid vague titles:

- `Updates`
- `Fix stuff`
- `Changes`

### 3.3 Description Template

Use a consistent structure:

```markdown
## Summary
Explain what this PR does in 1–3 sentences.

## Motivation
Why is this change needed? What problem does it solve?

## Changes
- Added password reset endpoint
- Created email template
- Updated rate-limiting rules

## How to Test
1. Run `make dev`
2. Create a user
3. Request password reset
4. Verify email content

## Related Issues
- Closes #123
````

### 3.4 Before Opening a PR

* Rebase on the latest main branch
* Run tests locally
* Ensure linting/formatting passes
* Remove debug code
* Confirm the PR is minimal and focused

### 3.5 Creating a PR with GitHub CLI

From your feature branch:

```bash
gh pr create \
  --base main \
  --head feature/user-authentication \
  --title "Add user authentication flow" \
  --body-file pr.md
```

Where `pr.md` contains the structured description.

For interactive mode:

```bash
gh pr create
```

GitHub CLI will prompt for:

* Title
* Description
* Base branch
* Reviewers

### 3.6 During Review

* Be polite and constructive in comments
* Make feedback **actionable**
* Prefer explanations over short commands
* If a suggestion is large, propose a patch

Example review comment:

> This logic is correct, but it’s hard to follow.
> Consider extracting it into a `parseToken()` helper so it can be reused and tested.

### 3.7 After Feedback

* Address comments promptly
* Push fixes in new commits
* Reply when a comment is resolved
* Request re-review if changes are significant

---

## 4. Why This Matters

Following these conventions provides:

* A readable and searchable Git history
* Automated changelogs and releases
* Faster code reviews
* Better onboarding for new team members
* High-quality input for tools and AI systems

Consistency is more important than perfection.
Once adopted, these rules should be enforced across the team.
