import { Octokit } from "@octokit/rest";

let client: Octokit | null = null;

export function getGithubClient(): Octokit {
  if (client) return client;
  client = new Octokit({
    auth: process.env.GITHUB_TOKEN,
    userAgent: "RepoPilot",
  });
  return client;
}
