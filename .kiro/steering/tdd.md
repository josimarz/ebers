---
inclusion: always
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 

# 🧠 Memory File — Best Practices for Applying TDD with TypeScript & Next.js

This document guides a Large Language Model (LLM) to write **robust, test-driven applications** using **TypeScript + Next.js**.  
It explains **how to structure tests, what to test, and how to leverage modern Next.js architecture with TDD** — including **good vs bad examples**.

---

## ✅ Core Principles of TDD

TDD follows the cycle:

### **RED → GREEN → REFACTOR**

1. **Write a failing test** (RED)
2. **Write the minimal code** to make it pass (GREEN)
3. **Improve the design safely** (REFACTOR)

Key values:

✔ Types are not tests  
✔ Tests describe behavior  
✔ Write the test before implementation  
✔ Keep tests deterministic  
✔ Prefer fast feedback loops  

---

## 🧪 Testing Stack (Recommended)

- **Jest** — unit + integration tests
- **React Testing Library** — UI behavior testing
- **Playwright/Cypress** — optional E2E
- **MSW** — mock network boundaries
- **Vitest** — acceptable modern alternative

---

## 📁 Test Project Structure

### 👍 Good (clear separation)

```

app/
users/
page.tsx
**tests**/
page.test.tsx
lib/
users.ts
**tests**/
users.test.ts

```

### 👎 Bad (mixed, inconsistent)

```

tests/
randomTests.js
components/
lib/

```

Tests should live **near the code** they verify.

---

## 🧠 What to Test

### ✅ DO TEST
✔ Business logic  
✔ UI behavior (not implementation details)  
✔ User flows  
✔ Contracts at API boundaries  
✔ Error states  

### ❌ DON’T TEST
✘ Library internals  
✘ Implementation details  
✘ Styling  
✘ Generated code  

---

## 📥 Example: TDD for a Pure Function

### Step 1 — Write failing test

```ts
// lib/__tests__/sum.test.ts
import { sum } from "../sum";

test("adds two numbers", () => {
  expect(sum(2, 3)).toBe(5);
});
```

### Step 2 — Minimal implementation

```ts
export function sum(a: number, b: number): number {
  return a + b;
}
```

### Step 3 — Refactor if needed

(no change here)

---

## ⚛️ TDD for React Components (Next.js App Router)

### Behavior we want

> “A button increments a counter when clicked.”

---

### Step 1 — RED test

```tsx
// app/counter/__tests__/Counter.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import Counter from "../Counter";

test("increments counter on click", () => {
  render(<Counter />);
  const button = screen.getByRole("button");

  fireEvent.click(button);

  expect(button).toHaveTextContent("1");
});
```

---

### Step 2 — Minimal implementation (GREEN)

```tsx
"use client";

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

---

### Step 3 — Refactor Safely

(if complexity grows)

---

## 🌐 TDD With Server Components

Server Components should contain **pure logic when possible**.

### Step 1 — Test data layer first

```ts
// lib/__tests__/users.test.ts
import { getUser } from "../users";

test("returns user by id", async () => {
  const user = await getUser("123");
  expect(user.id).toBe("123");
});
```

---

### Step 2 — Implement minimally

```ts
export async function getUser(id: string) {
  return { id, name: "John Doe" };
}
```

---

### Step 3 — Render logic separately (optional)

Avoid testing markup via Server Components unless necessary.

---

## 📡 Testing API Route Handlers

---

### Step 1 — Write failing test

```ts
// app/api/users/__tests__/route.test.ts
import { GET } from "../route";

test("returns users json", async () => {
  const res = await GET();
  const data = await res.json();

  expect(Array.isArray(data.users)).toBe(true);
});
```

---

### Step 2 — Minimal implementation

```ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ users: [] });
}
```

---

## 🧱 Strong Typing + TDD

Always test **behavior**, not types — but types enforce correctness.

### 👍 Good

```ts
function fetchUser(id: string): Promise<User> {}
```

### 👎 Bad

```ts
function fetchUser(id: any) {}
```

Types prevent invalid test scenarios.

---

## 🧪 React Testing Library — Best Practices

### ✅ Prefer user behavior

```ts
screen.getByRole("button");
```

### ❌ Avoid implementation details

```ts
container.querySelector("button");
```

---

## 🎭 Mocking Strategy

### Prefer:

✔ MSW for network
✔ Dependency injection
✔ Pure functions

### Avoid:

✘ Deep mocking
✘ Mocking React internals
✘ Global mutable state

---

## 🔁 Test Pyramid

```
▲  E2E (few)
▲  Integration (some)
▲  Unit (many)
```

Most value = **unit + integration**

---

## ⚡ Performance Practices

✔ Keep tests fast
✔ Isolate logic
✔ Reset mocks cleanly
✔ Avoid shared mutable state

---

## 🛑 Anti-Patterns

❌ Writing tests after code
❌ Over-testing implementation details
❌ Using `any` in test code
❌ Flaky async logic
❌ Snapshot testing everything
❌ Coupling tests to DOM structure

---

## 📌 Example: BAD Test

```ts
test("calls handleClick", () => {
  const spy = jest.spyOn(component, "handleClick");
});
```

This tests implementation, not behavior.

---

## 📌 Example: GOOD Test

```ts
test("opens modal when clicked", () => {
  fireEvent.click(screen.getByText("Open"));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
```

Behavior-driven ✔

---

## 🏁 Summary — Do & Don’t

### ✅ Do

* Follow **Red → Green → Refactor**
* Test behavior
* Type APIs strictly
* Keep tests close to code
* Mock external boundaries
* Prefer React Testing Library
* Separate business logic from UI

### ❌ Don’t

* Test implementation details
* Skip tests for speed
* Use `any`
* Create brittle snapshots
* Depend on network
* Over-mock

---

## 🎯 Goal

> Build **reliable, maintainable Next.js apps** using **TDD + TypeScript**, where tests define behavior and types guarantee correctness — resulting in fewer bugs and safer refactoring.
