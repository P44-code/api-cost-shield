# API Cost Shield

Control how much your team spends on AI. Admins give each employee or team a budget. Users get a warning as they approach the limit, and AI requests are blocked once the limit is reached.

---

## The Problem

When a whole team uses AI inside your app, costs can grow quickly and without notice. One heavy user or a runaway script can use up the entire budget before anyone realizes.

## The Solution

API Cost Shield sits in front of every Groq API request. It checks the user's remaining budget first, then allows, warns, or blocks the request.

---

## Features

- **Teams and employees:** Admins create teams and add members.
- **Budgets:** Set a limit per employee or per team, in dollars or tokens.
- **Warning alert:** Users are warned when they reach 80% of their budget.
- **Hard block:** Requests are blocked at 100%, and the user cannot use AI until the limit is raised or resets.
- **Usage tracking:** Every request saves tokens used and cost in MongoDB.
- **Admin controls:** Admins can raise, lower, or reset limits at any time.
- **Fail-safe:** If usage data can't be loaded, the request is blocked with a clear error instead of allowing unlimited spend.

---

## How It Works

1. An employee sends an AI request from the app.
2. The app looks up their current usage and limit in MongoDB.
3. It compares the two:

| Usage vs. limit | Result |
|---|---|
| Below 80% | Request allowed |
| 80% to 99% | Request allowed, warning shown |
| 100% or more | Request blocked, message shown |

4. If allowed, the request is sent to the Groq API.
5. Groq's response includes token counts (prompt, completion, total). These are converted to cost using the model's price and added to the user's usage.

---

## Configuration

Keep these values in one constants file so nothing is hardcoded in multiple places.

| Setting | Default | Description |
|---|---|---|
| `WARNING_THRESHOLD` | `0.8` | Fraction of budget that triggers a warning |
| `BLOCK_THRESHOLD` | `1.0` | Fraction of budget that blocks requests |
| `BUDGET_PERIOD` | `monthly` | How often usage resets |
| `BUDGET_UNIT` | `usd` or `tokens` | What the budget is measured in |
| `MODEL_PRICING` | see below | Price per 1M input and output tokens, per model |

Example pricing constant (fill in real numbers from the Groq pricing page):

```js
// src/constants/pricing.js
export const MODEL_PRICING = {
  "your-model-name": { inputPerMillion: 0.0, outputPerMillion: 0.0 },
};
```

---

## Tech Stack

- Frontend: [your frontend]
- Backend: [your backend]
- Database: MongoDB
- AI Provider: Groq API

---

## Database Collections

| Collection | Purpose |
|---|---|
| `teams` | Team name and team-level budget |
| `users` | Employee details, role, and team |
| `budgets` | Limit, unit, period, and current usage |
| `usagelogs` | One record per request: user, model, tokens, cost, time |

Usage totals are updated with MongoDB's atomic `$inc` operator so simultaneous requests cannot overwrite each other.

---

## Getting Started

### Prerequisites

- Node.js [version]
- A MongoDB database (local or Atlas)
- A Groq API key



### Environment Variables

Create a `.env` file in the project root. Never commit it to Git.

```
GROQ_API_KEY=your_groq_key
MONGODB_URI=your_mongodb_connection_string
```

### Run the App

```bash
npm run dev
```

---

## Usage

**Admins**
1. Sign in to the admin dashboard.
2. Create a team and add employees.
3. Set a budget for each employee or team.
4. Monitor usage and adjust limits when needed.

**Employees**
1. Use AI features as normal.
2. If you see a warning, you are close to your limit.
3. If you are blocked, ask your admin to raise your limit or wait for the reset.

---

## Roadmap

- [ ] Email or Slack alerts for admins
- [ ] Usage charts and reports
- [ ] Rate limiting
- [ ] CSV export

---
