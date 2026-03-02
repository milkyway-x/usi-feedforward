# USI FeedForward
### Digital Customer Service Feedback System
**Universidad de Sta. Isabel De Naga, Inc.**

---

## What is USI FeedForward?

USI FeedForward is a secure, QR-powered digital feedback platform that replaces the traditional paper-based customer service evaluation system used within the university. Every faculty member, non-teaching employee, and student has a unique QR code linked directly to their institutional ID. When a customer receives a service — whether from the registrar, a faculty member, a clinic staff, or any other department — they simply scan the QR code and fill out a structured digital feedback form in seconds.

---

## Why This Beats Paper Forms — By a Wide Margin

### The Problem with the Paper System

The original paper-based feedback system had a critical and well-known vulnerability: **there was no way to verify that the person filling out the form had actually received service**. An employee could theoretically:

- Fill out blank forms themselves
- Ask friends or colleagues to repeatedly rate them
- Inflate their ratings artificially over time

Even with control numbers, these could be bypassed simply by claiming to have served more customers than was actually the case — and no one could prove otherwise.

### How USI FeedForward Eliminates These Vulnerabilities

| Problem (Paper) | Solution (FeedForward) |
|---|---|
| Anyone can fill a form | Must have a registered account to submit |
| Employee can self-submit | Self-rating is technically blocked at the database level |
| Repeated raters go undetected | Admin dashboard flags same-person repeat submissions |
| No audit trail | Every submission logs user ID, timestamp, and IP |
| Results only seen at awarding day | Real-time dashboards, always up to date |
| Privacy is uncertain | Recipients never see who rated them |
| Lost or damaged slips | All data stored securely in the cloud |
| Requires manual tabulation | Averages and rankings calculated automatically |

---

## Key Features

### For All Users (Teaching, Non-Teaching, Students)
- **Unique QR Code** — Each registered user gets a QR code tied to their institutional ID. Display it at your desk, print it, or share the link.
- **Receive Anonymous Feedback** — Customers scan your QR and rate you on 7 criteria from the official USI form.
- **Real-Time Notifications** — Get notified instantly when you receive new feedback.
- **Personal Dashboard** — View your overall average rating, per-category breakdown, and historical feedback (without knowing who rated you).
- **Mutual Participation** — Teaching staff, non-teaching staff, and students can all be both evaluators and recipients.

### For Administrators
- **Full Visibility** — Admins see both the recipient and the giver for every feedback entry.
- **Suspicious Activity Detection** — Automated view flags any giver who has rated the same person 3 or more times — a clear indicator of potential gaming.
- **Flag & Investigate** — Admins can flag suspicious submissions and require justification.
- **Leaderboard View** — See top performers by department, role, or overall score — awards-day ready at any time.
- **User Management** — View all registered users, their roles, departments, and feedback statistics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Backend / Database | Supabase (PostgreSQL + Auth + RLS) |
| QR Generation | qrcode.react |
| Routing | React Router v6 |
| Notifications | react-hot-toast |
| Deployment | Vercel |

---

## Setup Guide

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- A [Google Cloud Console](https://console.cloud.google.com) account
- A [Vercel](https://vercel.com) account

### 1. Clone & Install

```bash
git clone https://github.com/your-org/usi-feedforward.git
cd usi-feedforward
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the Supabase dashboard, go to **SQL Editor** and run the entire contents of `supabase-schema.sql`.
3. In **Project Settings → API**, copy your **Project URL** and **anon public key**.

### 3. Configure Google OAuth

**In Google Cloud Console:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Add **Authorized redirect URIs**:
   - For local dev: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   - For production: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback` (same — Supabase handles the redirect)
5. Copy the **Client ID** and **Client Secret**

**In Supabase Dashboard:**
1. Go to **Authentication → Providers → Google**
2. Enable it, paste your Google **Client ID** and **Client Secret**
3. Save

**Optional — restrict to your school domain only:**
In `AuthContext.jsx`, uncomment this line to enforce `@usi.edu.ph` accounts only:
```js
// hd: 'usi.edu.ph',
```

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 5. Run Locally

```bash
npm run dev
```

Visit `http://localhost:5173`

**Important for local OAuth:** In Supabase → **Authentication → URL Configuration**, add `http://localhost:5173` to **Additional Redirect URLs**.

### 6. Create the First Admin

1. Sign in via Google through the app — complete the onboarding form.
2. In Supabase → **Table Editor → profiles**, find your row.
3. Set the `role` column to `admin`.

After this, you can log in and access `/admin`.

### 7. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Set the environment variables in the Vercel dashboard under **Settings → Environment Variables**. Then in Supabase → **Authentication → URL Configuration**, add your Vercel production URL to **Site URL** and **Additional Redirect URLs**.

---

## Usage Flow

```
1. Employee registers → gets a unique QR code
2. Employee displays QR code at their workplace
3. Customer scans QR code with their phone
4. Customer logs in (or is redirected to login)
5. Customer fills out the 7-question form (1-4 rating scale)
6. Submission is recorded with timestamp, giver ID, recipient ID
7. Employee receives a notification ("Someone rated you!")
8. Employee sees updated average on their dashboard (no giver name shown)
9. Admin can view all data including giver identities
10. Admin flags suspicious repeat patterns for investigation
11. At awards day, admin exports leaderboard — already ready
```

---

## Rating Scale (Official USI Rubric)

| Score | Label | Descriptor |
|---|---|---|
| 1.0 – 2.0 | Needs Improvement | Strongly Disagree |
| 2.1 – 2.9 | Satisfactory | Disagree |
| 3.0 – 3.5 | Very Satisfactory | Agree |
| 3.6 – 4.0 | Excellent | Strongly Agree |

---

## Security & Privacy

- **Row Level Security (RLS)** is enabled on all tables. Users can only access their own data.
- **Recipients never see giver identities** — the UI intentionally omits this field.
- **Only admins** can query the full feedback table with giver information.
- **Self-rating is blocked** at the application level (user ID check before submission).
- **24-hour cooldown** prevents the same user from rating the same person multiple times per day.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## License

MIT © Universidad de Sta. Isabel De Naga, Inc.
