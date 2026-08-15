<div align="center">

<img src="./assets/images/icon.png" width="120" alt="Dooing app icon" />

# Dooing

**Your Neovim todo list and timeblocking calendar, on your phone.**

Dooing is the mobile companion to [`dooing.nvim`](https://github.com/atiladefreitas/dooing)
and [`bloocky.nvim`](https://github.com/atiladefreitas/bloocky) — scan a QR code
in your editor and your tasks and time blocks land on your phone, over your own
Wi-Fi, with no account and no cloud in between.

[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000?logo=expo&logoColor=white)](https://docs.expo.dev/versions/v57.0.0/)
[![React Native 0.86](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)

</div>

---

## Why this exists

The best todo list is the one that lives where you already are. For a lot of us,
that's a terminal — which is exactly the problem the moment you step away from
the desk.

Dooing doesn't try to replace your editor workflow. It **mirrors** it. The same
todos, the same `#tags`, the same three-state cycle, the same time blocks — with
a UI that borrows the vocabulary of the terminal rather than fighting it. Tree
guides instead of indentation. `[ ]` `[~]` `[x]` instead of toggles. A vim-style
status line above the tab bar. `~` filler on an empty list, because of course.

No account. No server. No telemetry. Your data goes from your machine to your
phone and stops there.

---

## Built on two Neovim plugins

Dooing is a companion, not a standalone product. Everything it shows starts life
in one of these:

<table>
<tr>
<td width="50%" valign="top">

### 🥅 [dooing.nvim](https://github.com/atiladefreitas/dooing)

> *The minimalist to-do list for Neovim.*

A distraction-free floating window for capturing tasks without leaving the
editor. `#tag` categorization, nested subtasks, due dates, priorities,
per-project lists via git, due-date notifications, and two UI styles.

```vim
:Dooing            " global todos
:DooingLocal       " project todos
:DooingDue         " what's due
```

**This app is its mobile client.** The `Todo` shape in `src/types/todo.ts` is
kept byte-compatible with the plugin's own todo objects.

</td>
<td width="50%" valign="top">

### 🗓️ [bloocky.nvim](https://github.com/atiladefreitas/bloocky)

> *A timeblocking calendar for Neovim.*

Plan your day by placing time blocks on a calendar with day, week and month
views, navigate everything with `hjkl`, and optionally bring your Dooing tasks
straight onto the calendar.

```vim
:Bloocky day|week|month
:BloockyToggle
:BloockyAdd
```

**This app's calendar tab is its mobile client.** Recurrence rules, 30-minute
granularity and the `Block` JSON shape all come from here.

</td>
</tr>
</table>

If you don't use these plugins yet, the app still works standalone — but the sync
button is the whole point, so start there.

---

## Features

### Todos

- **Three-state cycle** — `[ ]` pending → `[~]` in progress → `[x]` done, exactly
  as `toggle_todo` behaves in the plugin.
- **Real subtask trees** — arbitrary nesting with continuous vertical guides drawn
  as geometry (not `│` glyphs), so a subtree never visually detaches from its
  parent. Collapse any branch.
- **Status sections** — `IN PROGRESS` → `PENDING` → `DONE`, mirroring the plugin's
  modern UI. Empty sections disappear.
- **Inline `#tags`** — the first tag becomes the category, every tag gets a stable
  color derived from an FNV-1a hash, so `#dev` is the same color today, tomorrow
  and on the calendar.
- **Priorities, due dates, estimates, notes** — all round-trip fields, edited from
  a bottom sheet that actually behaves with the keyboard up.
- **Status line** — open count, overdue count and time since last sync, pinned
  above the tab bar like a vim mode-line.

### Calendar

- **Day, 3-day and month views** with a live "now" line and 30-minute snapping.
- **Drag to move, drag to resize** blocks, with overlap layout that splits
  colliding blocks into columns instead of hiding them.
- **Drag a todo onto the grid to schedule it** — the unscheduled tray sits under
  the calendar and holds everything that has no block yet.
- **Recurrence** — daily, weekly, weekdays and custom weekday sets, with an
  optional end date. Occurrences are computed, never materialized.
- **Todo ↔ block links** — a scheduled todo shows `Today 14:30` on its row and taps
  through to the right day; ticking it off on the calendar ticks it off everywhere.

### Sync

- **QR import** — point the camera at the code from the plugin's share action.
  The pull renders as a terminal process log, because reaching a Neovim instance
  over the LAN deserves to *look* like what it is.
- **Re-sync from Settings** — the last host is remembered; one tap re-pulls.
- **Non-destructive merge** — server todos win for their own ids, locally-created
  todos are preserved, and blocks are best-effort so an older plugin without a
  `/blocks` endpoint still imports todos fine.

### Craft

- **Two hand-built themes** — a Tokyo Night–derived `night` and a matching `day`,
  plus `system`. Persisted across launches.
- **Type as a system** — JetBrains Mono for anything machine-ish (tags, times,
  counts, markers — all tabular), Inter for anything a human wrote.
- **Semantic color tokens only** — `bg-surface`, `text-fg-muted`, `border-line`.
  No `bg-neutral-800` anywhere; stock Tailwind scales aren't theme-aware and are
  deliberately excluded from the config.

---

## How sync works

```
┌──────────────────────────┐                       ┌─────────────────────┐
│  Neovim                  │                       │  Dooing (phone)     │
│                          │                       │                     │
│  dooing.nvim   ──todos──▶│                       │                     │
│  bloocky.nvim  ──blocks─▶│  server.lua           │                     │
│                          │  binds 0.0.0.0:7283   │                     │
│                          │                       │                     │
│                          │  GET /todos   ────────┼──▶ merge → zustand  │
│                          │  GET /blocks  ────────┼──▶ merge → zustand  │
│                          │                       │        │            │
│                          │  QR: http://<ip>:7283 │        ▼            │
│                          │       /todos     ─────┼──▶ AsyncStorage     │
└──────────────────────────┘                       └─────────────────────┘
            same Wi-Fi, plain HTTP, nothing leaves the LAN
```

A few things worth knowing:

- **Port `7283` is fixed.** The scanner rejects any QR that isn't
  `http://<ip>:7283/todos`, so pointing it at a random code does nothing.
- **Sync is one-way today** (Neovim → phone). Local edits are marked `_dirty` and
  the on-wire shape is preserved via `toWire()`, so the phone → Neovim direction
  is a matter of adding the endpoint, not reworking the model.
- **Timestamps are UNIX *seconds*,** matching Lua's `os.time()` — not
  milliseconds. Lua's JSON encoder omits `nil` fields, so optional fields arrive
  *absent* rather than `null` and are normalized on import.
- Requires a version of `dooing.nvim` that ships the share server. If your plugin
  copy has no share/QR action, update it first.

---

## Getting started

### Requirements

- Node 20+ and npm
- Xcode 16+ (iOS) or Android Studio (Android)
- A **development build** — Dooing uses `expo-camera`, `expo-glass-effect` and
  other native modules, so Expo Go won't run it

### Run it

```bash
git clone https://github.com/atiladefreitas/dooing-app
cd dooing-app
npm install

npm run ios       # build + launch on iOS
npm run android   # build + launch on Android
npm start         # dev server against an existing build
```

### Try it without Neovim

Settings → **Load test data** seeds a realistic set of todos and time blocks
covering every field, status, priority, recurrence type and overlap case. Handy
for poking at the calendar before wiring up the plugin.

### Import from Neovim

1. Make sure the phone and the machine are on the **same Wi-Fi**.
2. Run the share action in `dooing.nvim` — it starts the server on `:7283` and
   shows a QR code.
3. In the app: **scan** (header) or Settings → **Scan QR to import**.
4. Point at the code. Watch the log. Done.

> On iOS, the first scan asks for **Local Network** permission. Deny it and the
> fetch will time out with no obvious cause — grant it.

### Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run ios` / `npm run android` | Native build + launch |
| `npm run web` | Web target (calendar gestures are untuned here) |
| `npm run lint` | ESLint via `expo lint` |

---

## Project structure

```
src/
├── app/                        # expo-router, file-based, typed routes
│   ├── _layout.tsx             # fonts + store hydration gate behind the splash
│   ├── (tabs)/
│   │   ├── index.tsx           # todo list
│   │   └── calendar.tsx        # day / week / month + drag-to-schedule
│   ├── todo/[id].tsx           # todo editor
│   ├── scan.tsx                # QR scanner + process log
│   └── settings.tsx            # sync, appearance, seed, reset
├── components/
│   ├── calendar/               # time-grid, month-view, grid-view, tray
│   ├── todo-item.tsx           # row, tree guides, meta line
│   ├── status-line.tsx         # vim-style mode line
│   └── *-sheet.tsx             # gorhom bottom sheets
├── lib/
│   ├── api.ts                  # fetch + merge from a host
│   ├── qr.ts                   # share-URL parsing, endpoint builders
│   ├── todo.ts                 # todo model, tree flattening, status cycle
│   ├── block.ts                # block model, recurrence, overlap layout
│   ├── schedule.ts             # todo ↔ block links, next occurrence
│   ├── palette.ts              # deterministic tag → hue
│   ├── date.ts                 # `YYYY-MM-DD` key arithmetic
│   └── sections.ts             # status bucketing for the list
├── store/                      # zustand + persist(AsyncStorage)
│   ├── todos.ts  blocks.ts  theme.ts
├── constants/theme.ts          # palette, type scale, layout geometry
└── types/                      # the wire contract with the plugins
```

### Stack

| | |
| --- | --- |
| **Runtime** | Expo SDK 57, React Native 0.86, React 19 (React Compiler on) |
| **Routing** | expo-router with typed routes |
| **State** | zustand + `persist` over AsyncStorage |
| **Styling** | NativeWind 4 with `darkMode: 'class'` and CSS-variable tokens |
| **Motion** | Reanimated 4 + Gesture Handler for the calendar grid |
| **Sheets** | `@gorhom/bottom-sheet` + `react-native-keyboard-controller` |
| **Type** | JetBrains Mono + Inter, per-weight subpath imports |

---

## Design notes

A few decisions that are load-bearing and easy to undo by accident:

- **`darkMode: 'class'` is required.** NativeWind's `setColorScheme()` throws
  under the default `'media'`, which breaks the manual Night/Light override.
- **Tailwind's stock color scales are deliberately not extended.** Semantic
  tokens are the only theme-aware option; new code should never reach for
  `bg-neutral-*`.
- **Font weight comes from the family name, not `fontWeight`.**
  `font-mono font-bold` does *not* render bold in React Native — each weight is
  its own loaded family.
- **Tree guides are Views, not text.** A `│` glyph only exists on its own text
  line, so it breaks across row padding; stretched Views run unbroken between
  rows.
- **Accent (blue) and danger (red) are excluded from the category hue pool.** Blue
  means *time/today*, red means *overdue/important*. Let a tag borrow them and the
  color system stops meaning anything.

---

## Roadmap

- [ ] Two-way sync — push local edits back to `dooing.nvim`
- [ ] Push notifications for due dates
- [ ] Week view beyond 3 days
- [ ] Widgets / Live Activities for the current block
- [ ] Multi-host profiles (work laptop + personal machine)

---

## Contributing

Issues and PRs are welcome. If you're touching the sync path, keep
`src/types/todo.ts` and `src/types/block.ts` in lockstep with the plugins —
they're a wire contract, not just types. Run `npm run lint` before opening a PR.

---

## Credits

Built by [**Átila de Freitas**](https://github.com/atiladefreitas), alongside the
two plugins it exists to serve:

- [dooing.nvim](https://github.com/atiladefreitas/dooing) — the minimalist to-do list for Neovim
- [bloocky.nvim](https://github.com/atiladefreitas/bloocky) — a timeblocking calendar for Neovim

Color palette owes an obvious debt to [Tokyo Night](https://github.com/folke/tokyonight.nvim).

## License

[MIT](./LICENSE.md) © Átila de Freitas
