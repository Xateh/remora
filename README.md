# Remora — Academic Resource Discovery Engine

Remora is an AI-powered research assistant that helps students and academics **find the best learning materials on any topic** — by mining resources from top universities worldwide.

You give it your existing course materials (lecture slides, assignments, past papers) and it finds what else is out there that you're missing.

## How It Works

```
Your Materials
     │
     ▼
 ANALYZE              AI identifies distinct academic topics/scopes
     │                (e.g. "Neural Networks", "Backpropagation", "CNNs")
     ▼
 EXPAND               AI generates 3-5 keyword search variants per scope
     │                (broadening the search net)
     ▼
 DISCOVER  (Wave 1)   Parallel AI web agents search Google for each
     │                keyword set → find university course pages,
     │                slide links, assignment pages, PYPs
     ▼
 RETRIEVE  (Wave 2)   Parallel AI agents scrape and digest each
     │                discovered resource
     ▼
 ANALYZE              AI compares each resource against your existing
     │                materials → generates commentary on what each adds
     ▼
 OUTPUT               Curated resource list with explanations of
                      what each resource teaches beyond what you have
```

## Key Technical Ingredients

| Layer | Technology |
|-------|-----------|
| Web Framework | Next.js 16 (App Router) |
| AI Orchestration | OpenAI (scope analysis, keyword expansion, commentary) |
| Web Scraping Agents | **TinyFish** — parallel browser agents that search and scrape |
| Canvas Integration | OAuth via Canvas LMS API to pull course materials directly |
| Session/Job System | Iron Session + in-memory store with status polling |
| UI | React + Tailwind + shadcn/ui |

## What Makes It Interesting

- **Two-wave scraping architecture**: Wave 1 finds resources; Wave 2 retrieves and digests them. Both waves run in parallel across all scopes using `Promise.allSettled`, so one failed agent never blocks others.
- **Canvas LMS integration**: Users can connect their Canvas account to pull in their actual course slides, assignments, and readings directly — no manual upload needed.
- **Gap analysis focus**: The output isn't just a list of links — it's a curated commentary explaining *what each external resource adds beyond what you already have*.
- **Resilient by design**: Failed web scrapes still appear in results with an `error` flag rather than being silently dropped.

---

## Development

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
