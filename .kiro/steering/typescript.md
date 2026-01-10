---
inclusion: always
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 

# 🧠 Memory File — Best Practices for Writing Robust, Strongly-Typed TypeScript

This document guides a Large Language Model (LLM) to produce **safe, maintainable, and strongly-typed TypeScript code**.  
It emphasizes correctness, type-safety, clarity, and real-world production practices — with **good vs bad examples**.

---

## ✅ Core Principles

- Prefer **explicit, intentional types**
- Let the compiler infer types when safe — but not at API boundaries
- Avoid `any`
- Favor **immutability**
- Prefer **composition over inheritance**
- Make impossible states impossible
- Treat the TypeScript compiler as your first test suite

---

## 🧠 Type Inference vs Explicit Types

### Guideline
- **Let local variables infer**
- **Annotate function signatures**

### 👍 Good

```ts
const count = 5; // inferred as number

function add(a: number, b: number): number {
  return a + b;
}
```

### 👎 Bad

```ts
let count: any = 5;

function add(a, b) {
  return a + b;
}
```

Problems:

* `any` disables type safety
* untyped parameters become `any`

---

## 🚫 Avoid `any` — Prefer Safer Alternatives

Use:

* `unknown` for untrusted input
* `never` for impossible conditions
* proper types for everything else

### 👍 Good

```ts
function parse(input: unknown): string | null {
  if (typeof input === "string") return input;
  return null;
}
```

### 👎 Bad

```ts
function parse(input: any) {
  return input;
}
```

---

## 📦 Prefer Type Aliases or Interfaces for Structure

### 👍 Good

```ts
type User = {
  id: string;
  email: string;
  isAdmin?: boolean;
};
```

### 👎 Bad

```ts
function makeUser(user: { id: string; email: string; isAdmin?: boolean }) {}
```

Reason:

* reusable
* readable
* composable

---

## 🧩 Use `readonly` & Immutability

### 👍 Good

```ts
type User = {
  readonly id: string;
  name: string;
};
```

### 👎 Bad

```ts
type User = {
  id: string;
  name: string;
};
```

This prevents accidental mutation.

---

## 🧪 Narrow Types With Guards

### 👍 Good

```ts
function isString(v: unknown): v is string {
  return typeof v === "string";
}
```

```ts
if (isString(value)) {
  console.log(value.toUpperCase());
}
```

### 👎 Bad

```ts
console.log((value as string).toUpperCase());
```

Avoid assertions unless absolutely necessary.

---

## 🔐 Avoid Type Assertions (`as`) When Possible

Assertions skip safety checks.

### 👍 Good

```ts
if (typeof value === "number") {
  return value * 2;
}
```

### 👎 Bad

```ts
return (value as number) * 2;
```

---

## 🏗️ Prefer `unknown` Over `any` in APIs

### 👍 Good

```ts
function handle(data: unknown) {}
```

### 👎 Bad

```ts
function handle(data: any) {}
```

---

## 🔄 Use Enums or Literal Unions (Prefer Unions)

### 👍 Good

```ts
type Status = "idle" | "loading" | "success" | "error";
```

### 👎 Bad

```ts
const STATUS_IDLE = 0;
```

---

## 🧠 Make Impossible States Impossible

### 👍 Good

```ts
type LoadingState =
  | { status: "loading" }
  | { status: "success"; data: string }
  | { status: "error"; message: string };
```

Pattern: **discriminated unions**

---

## 🔍 Always Type API Boundaries

* Function parameters
* Return values
* External inputs

### 👍 Good

```ts
function fetchUser(id: string): Promise<User> {
  ...
}
```

### 👎 Bad

```ts
function fetchUser(id) {
  ...
}
```

---

## 📚 Prefer `type` for unions & primitives, `interface` for objects

Either works — but be consistent.

---

## 🏷️ Use Generics Thoughtfully

### 👍 Good

```ts
function wrap<T>(value: T): { value: T } {
  return { value };
}
```

### 👎 Bad

```ts
function wrap(value: any) {
  return { value };
}
```

---

## 🧮 Utility Types Are Powerful

Examples:

* `Partial<T>`
* `Readonly<T>`
* `Pick<T, K>`
* `Omit<T, K>`
* `Record<K,V>`

### 👍 Good

```ts
type UserUpdate = Partial<User>;
```

---

## 🚦 Strict Mode Required

Ensure:

```json
"strict": true
```

---

## 🧯 Error Handling Must Be Typed

### 👍 Good

```ts
try {
  doThing();
} catch (err: unknown) {
  if (err instanceof Error) console.error(err.message);
}
```

### 👎 Bad

```ts
catch (err) {
  console.log(err.message);
}
```

---

## 🧭 Avoid Overly Complex Types

If a type becomes unreadable:

* simplify logic
* extract helpers
* add docs

---

## 🧹 Naming Conventions

✔ Meaningful
✔ LowerCamelCase for variables
✔ UpperCamelCase for types

### 👍 Good

```ts
type OrderHistory = ...
```

### 👎 Bad

```ts
type oh = ...
```

---

## 🧪 Tests Love TypeScript

Prefer compile-time safety to runtime failure.

---

## 🛑 Anti-Patterns

### ❌ `any` everywhere

### ❌ Unvalidated external data

### ❌ Type assertions for convenience

### ❌ Returning mixed shapes

### ❌ Dynamic key hacks without typing

---

## 🏁 Summary — Do & Don’t

### ✅ Do

* Type public APIs
* Use inference locally
* Prefer unions & literals
* Use immutability
* Narrow unknown input
* Prevent invalid states

### ❌ Don’t

* Use `any`
* Assert types blindly
* Mix logic & structure
* Skip strict mode
* Prevent inference with over-annotation

---

## 🎯 Goal

> Write **robust, safe, maintainable TypeScript** that leverages the type system to eliminate whole classes of bugs — before runtime.
