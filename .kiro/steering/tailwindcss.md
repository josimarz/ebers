---
inclusion: always
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 

# 🧠 Memory File — Best Practices for Using Tailwind CSS

This document is a reference for a Large Language Model (LLM) to produce **clean, scalable, and maintainable code when using Tailwind CSS**.  
It explains concepts, patterns, and includes **good vs bad examples**.

---

## ✅ Core Principles

- Prefer **utility-first styling**
- Keep class lists **readable and intentional**
- Use **design tokens via config**, not magic numbers
- Extract **reusable UI via components or class groups**
- Avoid **deeply nested CSS overrides**
- Ensure **accessibility and responsiveness**
- Keep styling **close to the markup**

---

## 🎨 When to Use Tailwind CSS

✔ Component-based UIs  
✔ Design systems  
✔ Rapid prototyping  
✔ Highly customizable styling  

Avoid Tailwind if:

❌ You require global document-level resets only  
❌ You expect very heavy runtime dynamic styling logic

---

## 📁 Project Organization

### 👍 Good

```

components/
Button.tsx
Card.tsx
styles/
globals.css
tailwind.config.js

```

### 👎 Bad

```

css/
overrides.css
random-styles/
unused.css

```

> Keep Tailwind usage organized around components.

---

## 🧱 Utility Classes — Best Practices

### Keep classes readable and grouped logically:

- Layout  
- Spacing  
- Typography  
- Colors  
- Effects / State  

### 👍 Good

```tsx
<button
  className="
    inline-flex items-center justify-center
    px-4 py-2
    text-sm font-medium
    text-white
    bg-blue-600 hover:bg-blue-700
    rounded-lg shadow
  "
>
  Submit
</button>
```

### 👎 Bad

```tsx
<button className="hover:bg-blue-700 text-sm py-2 inline-flex bg-blue-600 shadow px-4 items-center text-white justify-center rounded-lg font-medium">
  Submit
</button>
```

Readable > compressed.

---

## 🧩 Extract Reusable Styles

Use **componentization or class merging utilities**.

### 👍 Good

```tsx
// Button.tsx
export function Button({ children }) {
  return (
    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
      {children}
    </button>
  );
}
```

### 👎 Bad

```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg">Edit</button>
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg">Delete</button>
```

Avoid duplication.

---

## ⚙️ Use Tailwind Config for Tokens

Put constants in `tailwind.config.js`.

### 👍 Good

```js
theme: {
  extend: {
    colors: {
      brand: "#1e40af"
    }
  }
}
```

```tsx
<div className="text-brand" />
```

### 👎 Bad

```tsx
<div className="text-[#1e40af]" />
```

Magic numbers reduce maintainability.

---

## 📏 Responsive Design

Tailwind uses **mobile-first breakpoints**.

### 👍 Good

```tsx
<p className="text-base md:text-lg lg:text-xl">
  Responsive text
</p>
```

### 👎 Bad

```css
@media (min-width: 1024px) {
  p { font-size: 20px }
}
```

Prefer Tailwind utilities.

---

## 🌗 Dark Mode

Use Tailwind’s dark mode variant.

### 👍 Good

```tsx
<div className="bg-white dark:bg-gray-900">
  Content
</div>
```

### 👎 Bad

```css
body.dark div {
  background: #111;
}
```

---

## 🧪 State Variants

Use built-in state classes.

### 👍 Good

```tsx
<input
  className="
    border
    focus:ring-2 focus:ring-blue-500
    disabled:opacity-50
  "
/>
```

### 👎 Bad

```css
input:focus {
  outline: 2px solid blue;
}
```

---

## ♿ Accessibility Matters

Prefer:

✔ `focus-visible`
✔ matching color contrast
✔ semantic HTML

### 👍 Good

```tsx
<button className="focus-visible:ring-2 focus-visible:ring-blue-500">
  Continue
</button>
```

---

## 🚀 Performance Best Practices

✔ Remove unused CSS with JIT/Purge
✔ Avoid arbitrary dynamic class strings
✔ Prefer static class names where possible

### 👎 Bad

```tsx
<div className={`text-${size}`}></div>
```

This prevents tree-shaking.

---

## 🧼 Avoid Overly Long Class Lists

If a class list becomes unmanageable, extract it.

### 👍 Good

```tsx
const card =
  "rounded-xl border p-6 shadow bg-white dark:bg-gray-900";

<div className={card} />;
```

### 👎 Bad

```tsx
<div className="rounded-xl border shadow p-6 bg-white dark:bg-gray-900 ..." />
```

---

## 🏗️ Use Plugins When Appropriate

Examples:

* Typography
* Forms
* Line clamp

```js
plugins: [
  require("@tailwindcss/typography"),
  require("@tailwindcss/forms"),
]
```

---

## 🧠 Naming Strategy

Tailwind = **class-based styling**
Not BEM
Not CSS Modules

So avoid naming classes like:

❌ `btn__primary--large`

Instead rely on:

✔ Component naming
✔ Utility composition

---

## 🛑 Anti-Patterns

### ❌ Do NOT replicate CSS frameworks on top of Tailwind

Bad:

```tsx
<div className="card card-header card-body">...</div>
```

Tailwind already *is* the system.

---

### ❌ Avoid inline style duplication

Bad:

```tsx
<div className="p-4 border" />
<div className="p-4 border" />
<div className="p-4 border" />
```

Extract it.

---

### ❌ Avoid global overrides

Bad:

```css
* {
  letter-spacing: 4px;
}
```

---

## 🏁 Summary — Do & Don’t

### ✅ Do

* Keep utilities readable
* Extract reusable patterns
* Use config tokens
* Prefer server-safe static class names
* Maintain accessibility
* Be intentional with spacing & layout

### ❌ Don’t

* Overuse arbitrary values
* Duplicate long class lists
* Hide logic in CSS files
* Dynamically compose class names excessively
* Break Tailwind purge

---

## 🎯 Goal

> Create **clean, scalable UI** using Tailwind’s utility-first approach — without sacrificing readability or maintainability.
