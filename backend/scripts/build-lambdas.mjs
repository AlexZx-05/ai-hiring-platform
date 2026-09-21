import { build } from "esbuild";
import { rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputRoot = path.join(root, ".lambda-dist");

const handlers = {
  jobs: "lambdas/jobs/handler.ts",
  applications: "lambdas/applications/handler.ts",
  recruiter: "lambdas/recruiter/handler.ts",
  recruiterDashboard: "lambdas/recruiterDashboard/handler.ts",
  publicJobs: "lambdas/publicJobs/handler.ts",
  applicationAnalysis: "lambdas/applicationAnalysis/handler.ts",
  recruiterInvitations: "lambdas/recruiterInvitations/handler.ts",
  postConfirmation: "lambdas/postConfirmation/handler.ts",
};

await rm(outputRoot, { recursive: true, force: true });

await Promise.all(
  Object.entries(handlers).map(([name, entryPoint]) =>
    build({
      entryPoints: [path.join(root, entryPoint)],
      outfile: path.join(outputRoot, name, "index.js"),
      bundle: true,
      format: "cjs",
      platform: "node",
      target: "node20",
      sourcemap: false,
      minify: false,
      legalComments: "none",
      logLevel: "info",
    })
  )
);
