# Deployment and environment configuration

## Recommended portfolio deployment

- **Web application:** Vercel Hobby using the repository root.
- **Authentication:** Clerk Hobby.
- **Quality API and AI service:** Render Free web services using `render.yaml`.
- **Operational database:** MongoDB Atlas Free cluster.
- **Vector database:** Qdrant Cloud Free cluster.

This topology is suitable for a recruiter-facing portfolio demonstration. Free Render services sleep after inactivity and are not an availability-guaranteed production environment. For a real company rollout, move both services to paid instances with backups, monitoring, and availability targets.

## Values that must be supplied by the project owner

| Variable | Location | Source |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel | Clerk Dashboard → API keys |
| `CLERK_PUBLISHABLE_KEY` | Render API | Same Clerk publishable key |
| `CLERK_SECRET_KEY` | Vercel and Render API | Clerk Dashboard → API keys |
| `MONGODB_URL` | Render API | MongoDB Atlas connection string |
| `QDRANT_URL` | Render AI | Qdrant cluster endpoint |
| `QDRANT_API_KEY` | Render AI | Qdrant API key |
| `AI_INTERNAL_API_KEY` | Both Render services | One identical random secret, at least 24 characters |

## Values filled in after deployment

| Variable | Location | Value |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Vercel | Final Vercel production URL |
| `QUALITY_API_URL` | Vercel | Render Quality API URL |
| `CORS_ORIGIN` | Render API | Final Vercel production URL |
| `AI_SERVICE_URL` | Render API | Render AI service URL |
| `AI_CORS_ORIGIN` | Render AI | Render Quality API URL |

## Clerk setup

1. Create a Clerk application and enable email/password or Google sign-in.
2. Add the Vercel production domain under allowed origins/domains.
3. Add both Clerk keys to Vercel; add the publishable and secret keys to the Render API.
4. Redeploy. The root application route is protected automatically.
5. New users see the four-step walkthrough. Skipping or completing it stores `qualityCopilotOnboarded` in Clerk public metadata.

No webhook is required for the walkthrough. Add `CLERK_WEBHOOK_SIGNING_SECRET` only if user records are later synchronized into MongoDB.

## Verification checklist

- anonymous requests redirect to Clerk sign-in;
- authenticated users can load the dashboard;
- the first session shows the walkthrough;
- Skip and Enter workspace prevent repeat display after reload;
- the user menu supports account management and sign-out;
- incident reads and writes require a Clerk session token;
- AI requests travel through the authenticated API and use a separate internal service secret;
- `/health` reports database readiness;
- CORS permits only the deployed web origin.
