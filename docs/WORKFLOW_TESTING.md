# Hiring Workflow Test Guide

This guide verifies the complete recruiter-to-candidate workflow with two different accounts. Use an ordinary browser profile for the recruiter and an incognito/private window (or a different browser) for the candidate.

## 1. Deploy the current backend

The browser can display the UI locally, but real résumé upload, application storage, AI analysis, and status changes require AWS. From the repository root:

```powershell
cd backend
npm ci
npm run build

cd ..\infrastructure\terraform\environments\dev
terraform init -backend-config=backend.hcl
terraform plan -out=tfplan
terraform apply tfplan
```

After deployment, copy the Terraform outputs into `frontend/.env.local` as described in the README. The xAI secret must be configured if you expect AI scores; otherwise applications will remain available for manual review but automated scoring will fail.

## 2. Start the frontend

```powershell
cd frontend
npm ci
npm run dev
```

Open the local URL shown by Next.js, normally `http://localhost:3000`.

## 3. Recruiter: create a live role

1. Sign in with a recruiter account. Recruiter accounts are created through the admin invitation flow; self-service sign-up creates candidate accounts only.
2. Open **Job postings** → **Create job**.
3. Fill in title, department, location, job description, requirements, and skills.
4. Under **Job screening questions**, add two or three job-relevant questions. Try one written response, one Yes/No question, and one multiple-choice question.
5. Publish the job and select **Copy job link** from the job review page.

Expected result: the recruiter job page shows the public link, empty applicant metrics, and the new job is visible from the candidate jobs list after the deployed backend is used.

## 4. Candidate: apply from the shared link

1. In the private browser window, open the copied job link.
2. Sign in as a candidate, or create and verify a candidate account. After sign-in, the application returns to the same job link.
3. Answer every required screening question.
4. Upload a valid text-based PDF résumé smaller than 5 MB.
5. Optionally add a short note and select **Submit application**.

Expected result: the page confirms submission with an application reference. In **My applications**, the candidate initially sees `PARSING`, then `AI REVIEWED` after résumé parsing and job-specific analysis complete.

## 5. Recruiter: review and decide

1. Return to the recruiter job review page and select **Refresh applicants**.
2. Confirm the applicant shows a résumé link, screening answers, matched/missing skills, and an AI match score when analysis is configured.
3. Use the forward workflow in order:

   `AI REVIEWED → UNDER REVIEW → SHORTLISTED → INTERVIEW RECOMMENDED → INTERVIEW SCHEDULED → OFFER → HIRED`

4. Use **Reject** when a candidate should not progress. Add a recruiter note before deciding; it becomes part of the decision record.
5. Select **Prepare candidate email** or **Prepare decline email** to open a professional message for review in the recruiter’s mail client. This intentionally requires recruiter confirmation before sending.

Expected result: candidates are ranked by AI score first, with review stage and recent activity as tie-breakers. Every status decision is transition-checked and recorded in the application audit history.

## 6. Candidate: confirm progress is visible

1. In the candidate browser, open **My applications** and select **Refresh**.
2. Confirm the status label and its explanation change after each recruiter action.

Expected result: the candidate sees only their own application progress; recruiters see the résumé, job-specific answers, scoring evidence, and recruiter notes for applicants to their jobs.

## Troubleshooting

- **Sample-data banner appears:** the frontend cannot reach the deployed jobs API. Check `NEXT_PUBLIC_API_BASE_URL`, Cognito values, and sign in again after updating `.env.local`.
- **Application remains `PARSING`:** inspect the résumé parsing Lambda/SQS logs. The PDF must contain extractable text.
- **No AI score:** confirm the application-analysis Lambda deployed and the xAI secret/environment variables are configured. The recruiter can still use manual review.
- **A new job is not in the candidate jobs list:** deploy this version of the jobs Lambda, then publish a new job. The public job catalog is written as each new job is created.
