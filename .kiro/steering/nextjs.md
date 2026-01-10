---
inclusion: always
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 
# 🧠 Memory File — Best Practices for Building Applications with Next.js

This document is a concise reference for a Large Language Model (LLM) to follow **best practices when building applications with Next.js**.  
It includes **guidelines**, **patterns**, and **good vs. bad examples** to encourage modern, production-ready usage.

---

## ✅ Core Principles

- Prefer **App Router (`app/`)** over the legacy **Pages Router (`pages/`)**
- Use **Server Components by default**
- Only use **Client Components when necessary**
- Favor **data fetching on the server**
- Keep **components small and composable**
- Ensure **type safety** (TypeScript strongly encouraged)
- Optimize for:
  - Performance
  - Accessibility
  - Maintainability

---

## 📁 Project Structure

### 👍 Good Example (App Router)

```

app/
layout.tsx
page.tsx
dashboard/
page.tsx
api/
users/
route.ts
components/
NavBar.tsx
lib/
db.ts

```

### 👎 Bad Example (Legacy / Mixed Patterns)

```

pages/
index.js
app/
dashboard/page.tsx
components/
navbar.jsx
utils/
data.js

```

**Avoid mixing `pages/` and `app/`.**

---

## 🧩 Server vs Client Components

### Rule of Thumb
- **Default to Server Components**
- Mark Client Components explicitly:

```tsx
"use client";
```

### 👍 Good (Server by Default)

```tsx
// app/page.tsx
export default async function Home() {
  const posts = await getPosts();
  return <PostsList posts={posts} />;
}
```

### 👎 Bad (Client Component Doing Server Work)

```tsx
"use client";

export default function Home() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch("/api/posts")
      .then(res => res.json())
      .then(setPosts);
  }, []);
}
```

❌ Avoid fetching server data in the browser when unnecessary.

---

## 🌐 Data Fetching

Prefer **async/await in Server Components**.

### 👍 Good

```tsx
export default async function User({ params }: { params: { id: string } }) {
  const user = await getUser(params.id);
  return <div>{user.name}</div>;
}
```

### 👎 Bad

```tsx
"use client";

export default function User({ id }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/user/${id}`)
      .then(r => r.json())
      .then(setUser);
  }, []);
}
```

---

## 📡 API Routes (Route Handlers)

### 👍 Good

```tsx
// app/api/users/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ users: [] });
}
```

### 👎 Bad

```js
// pages/api/users.js
export default (req, res) => {
  res.status(200).json({ users: [] });
};
```

Use Route Handlers in new apps.

---

## 🎭 Client Components — When to Use

Only when you need:

✔ Interactivity
✔ State
✔ Effects
✔ Browser APIs

### 👍 Good

```tsx
"use client";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  return <button onClick={() => setDark(!dark)}>Toggle</button>;
}
```

### 👎 Bad

```tsx
"use client";

export default function Title() {
  return <h1>Dashboard</h1>;
}
```

No need for client-side rendering here.

---

## 🧪 Type Safety

### 👍 Good

```ts
type Post = {
  id: string;
  title: string;
};

async function getPosts(): Promise<Post[]> {
  return [];
}
```

### 👎 Bad

```js
async function getPosts() {
  return [];
}
```

---

## 🎨 Styling

Prefer:

* CSS Modules
* Tailwind
* Styled-JSX (optional)

Avoid large global styles.

### 👍 Good (Tailwind)

```tsx
<h1 className="text-2xl font-bold">Dashboard</h1>
```

### 👎 Bad

```css
h1 {
  font-size: 60px;
}
```

---

## ⚡ Performance Best Practices

✔ Use Image Optimization (`next/image`)
✔ Use Link (`next/link`)
✔ Cache server data when safe
✔ Avoid unnecessary client JS

### 👍 Good

```tsx
import Image from "next/image";

<Image src="/logo.png" alt="Logo" width={200} height={200} />;
```

### 👎 Bad

```html
<img src="/logo.png" />
```

---

## 🔐 Security Best Practices

✔ Never expose environment variables to client
✔ Use **Server Actions carefully**
✔ Validate input
✔ Sanitize user-generated content

---

## 🌍 SEO Best Practices

Use **metadata API**:

### 👍 Good

```ts
export const metadata = {
  title: "Dashboard",
  description: "User dashboard",
};
```

### 👎 Bad

```html
<head>
  <title>Dashboard</title>
</head>
```

---

## 🧱 State Management Guidance

Use in order of preference:

1. Local state
2. Server state
3. Context (sparingly)
4. External stores (only if truly needed)

---

## 🏁 Summary: Do & Don’t

### ✅ Do

* Prefer **App Router**
* Prefer **Server Components**
* Fetch data on the server
* Type everything
* Keep UI modular
* Optimize images & links

### ❌ Don’t

* Fetch server data in client components
* Mix routing systems
* Overuse useEffect
* Put secrets in client code
* Ignore accessibility

---

## 📌 Example: Well-Structured Page

### 👍 Good

```tsx
// app/posts/page.tsx
import { getPosts } from "@/lib/db";

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <main>
      <h1>Posts</h1>
      <ul>
        {posts.map(p => (
          <li key={p.id}>{p.title}</li>
        ))}
      </ul>
    </main>
  );
}
```

---

## 🛑 Anti-Pattern Example

### 👎 Bad

```tsx
"use client";

export default function PostsPage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch("/api/posts")
      .then(res => res.json())
      .then(setPosts);
  }, []);

  return posts.map(p => <div>{p.title}</div>);
}
```

Issues:

* Unnecessary client rendering
* Extra network round-trip
* No type safety
* No keys
* Harder to cache

---

## 🎯 Goal

> Build **secure, scalable, and maintainable** Next.js apps using **App Router and Server Components first**.
