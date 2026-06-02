import { getGithubClient } from "@/lib/github/githubClient";

export type RepoOverview = {
  owner: string;
  name: string;
  url: string;
  description: string | null;
  defaultBranch: string;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  primaryLanguage: string | null;
  license: string | null;
  repoSizeKb: number;
  lastPushedAt: string | null;
  githubCreatedAt: string | null;
};

export async function fetchRepoOverview(
  owner: string,
  name: string
): Promise<RepoOverview> {
  const gh = getGithubClient();
  const { data } = await gh.repos.get({ owner, repo: name });
  return {
    owner,
    name,
    url: data.html_url,
    description: data.description,
    defaultBranch: data.default_branch,
    stars: data.stargazers_count,
    forks: data.forks_count,
    watchers: data.subscribers_count ?? data.watchers_count,
    openIssues: data.open_issues_count,
    primaryLanguage: data.language,
    license: data.license?.spdx_id ?? null,
    repoSizeKb: data.size,
    lastPushedAt: data.pushed_at,
    githubCreatedAt: data.created_at,
  };
}

export async function fetchCommitDates(
  owner: string,
  name: string
): Promise<string[]> {
  const gh = getGithubClient();
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data } = await gh.repos.listCommits({
    owner,
    repo: name,
    since,
    per_page: 100,
  });
  return data
    .map((c) => c.commit.author?.date ?? c.commit.committer?.date ?? null)
    .filter((d): d is string => Boolean(d));
}

export async function fetchOpenIssues(
  owner: string,
  name: string
): Promise<{ createdAt: string }[]> {
  const gh = getGithubClient();
  const { data } = await gh.issues.listForRepo({
    owner,
    repo: name,
    state: "open",
    per_page: 100,
  });
  // Exclude PRs (the issues endpoint includes them).
  return data
    .filter((i) => !i.pull_request)
    .map((i) => ({ createdAt: i.created_at }));
}

export async function fetchOpenPullRequests(
  owner: string,
  name: string
): Promise<{ createdAt: string; updatedAt: string }[]> {
  const gh = getGithubClient();
  const { data } = await gh.pulls.list({
    owner,
    repo: name,
    state: "open",
    per_page: 100,
  });
  return data.map((p) => ({ createdAt: p.created_at, updatedAt: p.updated_at }));
}

export async function fetchContributorCount(
  owner: string,
  name: string
): Promise<number> {
  const gh = getGithubClient();
  const { data } = await gh.repos.listContributors({
    owner,
    repo: name,
    per_page: 100,
  });
  return data.length;
}
