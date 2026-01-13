# Temple Party Finder - Frontend Architecture Guide

**Last Updated:** January 8, 2026
**Purpose:** Explain the file structure, why each file exists, and the reasoning behind our architecture decisions

---

## Table of Contents
1. [Project Structure Overview](#project-structure-overview)
2. [Why Next.js 14?](#why-nextjs-14)
3. [Folder Structure Explained](#folder-structure-explained)
4. [Design Patterns & Decisions](#design-patterns--decisions)
5. [Java/C Developer's Guide](#javac-developers-guide)

---

## Project Structure Overview

```
temple-parties/
├── frontend/                    # Next.js React application
│   ├── src/
│   │   ├── app/                # Next.js App Router (pages)
│   │   │   ├── page.tsx        # Homepage
│   │   │   ├── layout.tsx      # Root layout wrapper
│   │   │   └── globals.css     # Global styles
│   │   └── components/         # Reusable UI components
│   │       └── PartyCard.tsx   # Party display component
│   ├── package.json            # Dependencies & scripts
│   ├── tsconfig.json           # TypeScript configuration
│   └── tailwind.config.ts      # Tailwind CSS configuration
├── backend/                     # (Coming soon) Python FastAPI
├── PROGRESS.md                  # Development tracking
├── ARCHITECTURE.md              # This file
└── prd_v1.md                   # Product requirements
```

---

## Why Next.js 14?

### What is Next.js?
Next.js is a **React framework** that adds structure, routing, and optimization on top of React.

**Analogy for Java developers:**
- **React** = Like Java (the language)
- **Next.js** = Like Spring Boot (the framework that structures your Java app)

### Why We Chose It

**1. Built-in Routing**
- In plain React, you'd need to install `react-router-dom` and configure routes manually
- Next.js uses **file-based routing**: Create `app/about/page.tsx` → Automatically available at `/about`
- **Java equivalent:** Spring's `@RequestMapping` but automatic based on file structure

**2. Server-Side Rendering (SSR)**
- Pages can render on the server before reaching the browser
- Faster initial page loads
- Better SEO (search engines can read content)

**3. App Router (Latest Pattern)**
- Next.js 13+ introduced the "App Router" (vs old "Pages Router")
- More powerful, better performance
- Industry standard for new projects

**4. TypeScript Built-In**
- Type safety out of the box
- Catches errors before runtime (like Java compilation)

**5. Tailwind CSS Integration**
- Pre-configured with Tailwind (utility-first CSS)
- No need to write custom CSS files

---

## Folder Structure Explained

### Why This Structure?

Our structure follows **separation of concerns** - each folder has ONE responsibility.

---

### 📁 `frontend/`

**Purpose:** Contains the entire frontend application
**Why separate folder?** Keeps frontend and backend code completely isolated

**Java analogy:** Like having separate Maven modules for different services

---

### 📁 `frontend/src/`

**Purpose:** All source code lives here
**Why?** Separates source code from configuration files (package.json, tsconfig.json)

**Convention:** Next.js best practice - keeps root directory clean

---

### 📁 `frontend/src/app/`

**Purpose:** Next.js App Router - defines pages and routes
**Why called "app"?** This is the new Next.js 13+ pattern (replaces old "pages" folder)

**How routing works:**
```
src/app/page.tsx          → http://localhost:3000/
src/app/about/page.tsx    → http://localhost:3000/about
src/app/feed/page.tsx     → http://localhost:3000/feed
```

**Java analogy:**
```java
@GetMapping("/")          → page.tsx
@GetMapping("/about")     → about/page.tsx
@GetMapping("/feed")      → feed/page.tsx
```

**Key files:**
- `page.tsx` = The actual page content (like a controller method)
- `layout.tsx` = Wrapper around pages (like a base template)

---

### 📄 `frontend/src/app/page.tsx`

**Purpose:** The homepage of your app (root route `/`)
**Why here?** Next.js convention - `page.tsx` files define routes

**What it does:**
```typescript
export default function Home() {
  return <div>Content here</div>
}
```
- Exports a React component
- Returns JSX (HTML-like syntax)
- Automatically rendered at the root URL

**Java analogy:**
```java
@RestController
public class HomeController {
    @GetMapping("/")
    public String home() {
        return "index"; // Returns view
    }
}
```

**Why not call it `index.tsx`?**
- Next.js uses `page.tsx` as the convention
- More explicit (vs `index` which could be confused with array indices)

---

### 📄 `frontend/src/app/layout.tsx`

**Purpose:** Root layout that wraps ALL pages
**Why needed?** To share common elements across pages (nav, fonts, metadata)

**What it does:**
```typescript
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}  {/* page.tsx content goes here */}
      </body>
    </html>
  )
}
```

**Use cases:**
- Load fonts globally
- Add navigation bar on every page
- Set metadata (page title, description)
- Wrap pages with providers (auth, theme)

**Java analogy:** Like a decorator pattern or a servlet filter that wraps all requests

**Execution flow:**
```
User visits /feed
  ↓
RootLayout renders
  ↓
Injects feed/page.tsx as {children}
  ↓
Final HTML sent to browser
```

---

### 📄 `frontend/src/app/globals.css`

**Purpose:** Global CSS styles applied to entire app
**Why here?** Imported in `layout.tsx`, so applies everywhere

**What's in it:**
```css
@tailwind base;      /* Tailwind's reset styles */
@tailwind components; /* Tailwind component classes */
@tailwind utilities;  /* Tailwind utility classes */
```

**Why not regular CSS everywhere?**
- We use **Tailwind CSS** (utility-first)
- Instead of writing `.button { background: red; }`, we use `className="bg-red-500"`
- Faster development, consistent styling

**When to add custom CSS here:**
- Global font settings
- Custom animations
- Styles that need to apply everywhere

---

### 📁 `frontend/src/components/`

**Purpose:** Reusable UI components
**Why separate from `app/`?** Components are building blocks, not pages

**Key principle:** Components should be **reusable** and **composable**

**Naming convention:**
- PascalCase: `PartyCard.tsx` (not `partyCard.tsx`)
- Descriptive: Name describes what it displays

**Java analogy:** Like utility classes or reusable methods, but for UI

**Example:**
```typescript
// components/PartyCard.tsx - Can be used anywhere
export default function PartyCard({ name, location }) {
  return <div>{name} at {location}</div>
}

// app/page.tsx - Uses the component
import PartyCard from '@/components/PartyCard'
<PartyCard name="Party" location="Temple" />
```

---

### 📄 `frontend/src/components/PartyCard.tsx`

**Purpose:** Displays a single party's information
**Why separate file?** Follows **Single Responsibility Principle**

**What it does:**
- Takes party data as props (name, location, date, host)
- Returns JSX with styled HTML
- Reusable: can display any party, anywhere

**Why called "Card"?**
- UI design pattern: a card is a container for related info
- Common in modern web design (Google, Twitter, etc.)

**Structure:**
```typescript
// 1. Define props interface (contract)
interface PartyCardProps {
  name: string;
  location: string;
  date: string;
  host?: string;
}

// 2. Component function (takes props, returns JSX)
export default function PartyCard(props: PartyCardProps) {
  return (
    <div className="border p-8 rounded shadow">
      <h2>{props.name}</h2>
      <p>{props.location}</p>
    </div>
  );
}
```

**Why props?**
- Makes component flexible (can display any party)
- Separation: component doesn't care WHERE data comes from
- Testable: easy to pass different data

**Java analogy:**
```java
// Like a Java class with fields
public class PartyCard {
    private String name;
    private String location;

    public PartyCard(String name, String location) {
        this.name = name;
        this.location = location;
    }

    public String render() {
        return "<div>" + name + " at " + location + "</div>";
    }
}
```

---

### 📄 `frontend/package.json`

**Purpose:** Defines project dependencies and scripts
**Why needed?** npm uses it to install packages and run commands

**Java analogy:** Like `pom.xml` (Maven) or `build.gradle` (Gradle)

**Key sections:**
```json
{
  "dependencies": {
    "react": "^18.0.0",      // Like adding a Maven dependency
    "next": "14.0.0"
  },
  "scripts": {
    "dev": "next dev",       // npm run dev → starts dev server
    "build": "next build"    // npm run build → production build
  }
}
```

**When you modify it:**
- Add new libraries: `npm install axios` → Updates package.json
- Run scripts: `npm run dev` → Executes the "dev" script

---

### 📄 `frontend/tsconfig.json`

**Purpose:** TypeScript compiler configuration
**Why needed?** Tells TypeScript how to compile .tsx files to JavaScript

**Key settings:**
```json
{
  "compilerOptions": {
    "strict": true,           // Strict type checking (like Java)
    "target": "ES2017",       // JavaScript version to compile to
    "paths": {
      "@/*": ["./src/*"]      // Path alias: @/ = src/
    }
  }
}
```

**Why path aliases?**
- Instead of: `import PartyCard from '../../../components/PartyCard'`
- You write: `import PartyCard from '@/components/PartyCard'`
- Cleaner, easier to refactor

**Java analogy:** Like `javac` compiler options

---

### 📄 `frontend/tailwind.config.ts`

**Purpose:** Tailwind CSS configuration
**Why needed?** Customize colors, fonts, spacing

**What we'll add:**
```typescript
module.exports = {
  theme: {
    extend: {
      colors: {
        temple: {
          cherry: '#A41E35'  // Temple's brand color
        }
      }
    }
  }
}
```

**Then use in code:**
```typescript
<div className="text-temple-cherry">  {/* Uses #A41E35 */}
```

**Why not regular CSS?**
- Tailwind is faster (no switching between files)
- Utility-first: `p-4` = padding: 1rem
- Consistent spacing/colors across app

---

## Design Patterns & Decisions

### 1. Component-Based Architecture

**Pattern:** Break UI into reusable pieces

**Why?**
- **Reusability:** PartyCard can be used on feed page, map popup, admin panel
- **Maintainability:** Change PartyCard once, updates everywhere
- **Testability:** Test components in isolation

**Example:**
```
HomePage
├── Navbar (component)
├── PartyList (component)
│   ├── PartyCard (component)
│   ├── PartyCard (component)
│   └── PartyCard (component)
└── Footer (component)
```

**Java analogy:** Like having small, focused classes instead of one giant God class

---

### 2. Props for Data Flow

**Pattern:** Pass data down from parent to child

**Why?**
- **Unidirectional data flow:** Data flows one way (easier to debug)
- **Explicit:** You see exactly what data each component needs
- **Type-safe:** TypeScript enforces prop types

**Example:**
```typescript
// Parent passes data down
<PartyCard name="Party" location="Temple" />

// Child receives via props
function PartyCard({ name, location }) {
  // Uses name and location
}
```

**Java analogy:** Like constructor parameters or setter methods

---

### 3. TypeScript Interfaces

**Pattern:** Define types for props and data structures

**Why?**
- **Type safety:** Catch errors at compile time
- **Documentation:** Interface shows what data is needed
- **Autocomplete:** IDE suggests available properties

**Example:**
```typescript
interface PartyCardProps {
  name: string;
  location: string;
  host?: string;  // ? = optional
}
```

**Java equivalent:**
```java
public class PartyCardProps {
    private String name;
    private String location;
    private String host; // Can be null
}
```

---

### 4. File-Based Routing

**Pattern:** File structure = URL structure

**Why Next.js does this:**
- **Convention over configuration:** Less boilerplate
- **Automatic code splitting:** Each page loads only its code
- **Predictable:** Easy to find the file for a URL

**Example:**
```
src/app/feed/page.tsx        → /feed
src/app/map/page.tsx         → /map
src/app/admin/page.tsx       → /admin
```

**Traditional React (without Next.js) would require:**
```typescript
<Router>
  <Route path="/feed" component={Feed} />
  <Route path="/map" component={Map} />
  <Route path="/admin" component={Admin} />
</Router>
```

---

## Java/C Developer's Guide

### Concepts That Are Similar

| Java/C Concept | React/TypeScript Equivalent |
|----------------|----------------------------|
| `class Party` | `interface Party` |
| Constructor params | Props |
| `public void render()` | `return <div>...</div>` (JSX) |
| `ArrayList<Party>` | `Party[]` or `Array<Party>` |
| `for (Party p : parties)` | `parties.map(party => ...)` |
| `System.out.println()` | `console.log()` |
| Package imports | ES6 imports (`import X from 'Y'`) |
| Maven/Gradle | npm/package.json |

### Concepts That Are Different

**1. Mutability**
- Java: Objects are mutable by default
- React: Props are **immutable** (read-only)
- Why? Ensures predictable rendering

**2. No "this" in functional components**
- Java: `this.name` to access instance variables
- React functional components: Just use `name` (from props or local variables)

**3. JSX is not HTML**
- Looks like HTML but it's JavaScript
- Compiles to `React.createElement()` calls
- Example: `<div>{name}</div>` → `React.createElement('div', null, name)`

**4. No traditional loops in JSX**
- Can't use `for` loops inside JSX
- Use `.map()` instead (returns array of elements)

---

## Current Architecture Summary

### What We've Built So Far

```
User visits http://localhost:3000
    ↓
Next.js loads app/layout.tsx (root wrapper)
    ↓
Injects app/page.tsx as content
    ↓
page.tsx imports PartyCard component
    ↓
Renders one PartyCard with hardcoded data
    ↓
Browser displays styled party card
```

### What We'll Build Next

```
1. Multiple parties (arrays + .map())
2. Backend API (Python FastAPI)
3. Connect frontend to backend (fetch data)
4. Database (PostgreSQL)
5. Authentication (login/signup)
6. Advanced features (map, filters, ratings)
```

---

## Key Takeaways

1. **Next.js = React + Structure**
   - React provides components
   - Next.js provides routing, optimization, conventions

2. **File structure = URL structure**
   - `app/page.tsx` → `/`
   - `app/feed/page.tsx` → `/feed`

3. **Components = Reusable UI**
   - Like Java classes but for UI
   - Take props (parameters), return JSX (HTML-like)

4. **TypeScript = Safety**
   - Interfaces define contracts
   - Catches errors before runtime

5. **Separation of Concerns**
   - Pages (`app/`) define routes
   - Components (`components/`) define UI blocks
   - Keep them separate for maintainability

---

## Questions to Test Understanding

1. **Why do we have both `app/` and `components/` folders?**
   - Answer: `app/` = pages (routes), `components/` = reusable UI pieces

2. **What's the difference between `page.tsx` and `layout.tsx`?**
   - Answer: `page.tsx` = specific route content, `layout.tsx` = wrapper for multiple pages

3. **Why use TypeScript interfaces?**
   - Answer: Type safety, documentation, catches errors early

4. **What does the `@/` symbol mean in imports?**
   - Answer: Path alias for `src/` directory (configured in tsconfig.json)

5. **How is PartyCard reusable?**
   - Answer: Takes props, so you can pass different data each time you use it

---

## Resources for Deep Dive

**Next.js:**
- Official Docs: https://nextjs.org/docs
- App Router Guide: https://nextjs.org/docs/app

**React:**
- Official Tutorial: https://react.dev/learn
- Components: https://react.dev/learn/your-first-component

**TypeScript:**
- Handbook: https://www.typescriptlang.org/docs/handbook/intro.html
- Interfaces: https://www.typescriptlang.org/docs/handbook/interfaces.html

**Tailwind CSS:**
- Docs: https://tailwindcss.com/docs
- Cheat Sheet: https://nerdcave.com/tailwind-cheat-sheet

---

**Last Updated:** January 8, 2026
**Next Update:** After we add arrays, backend, and database
