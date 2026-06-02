CREATE TABLE "accessibility_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid,
	"url" text,
	"violation_count" integer,
	"critical_count" integer,
	"serious_count" integer,
	"moderate_count" integer,
	"minor_count" integer,
	"raw_result" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid,
	"url" text,
	"performance_score" integer,
	"lcp" numeric,
	"cls" numeric,
	"inp" numeric,
	"fcp" numeric,
	"tbt" numeric,
	"speed_index" numeric,
	"raw_result" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quality_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid,
	"has_readme" boolean,
	"readme_score" integer,
	"has_package_json" boolean,
	"has_typescript" boolean,
	"has_eslint" boolean,
	"has_prettier" boolean,
	"has_tests" boolean,
	"has_test_script" boolean,
	"has_lint_script" boolean,
	"has_typecheck_script" boolean,
	"has_ci" boolean,
	"has_env_example" boolean,
	"package_manager" text,
	"framework" text,
	"raw_result" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "repo_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid,
	"commits_30d" integer,
	"commits_90d" integer,
	"open_issues" integer,
	"open_prs" integer,
	"stale_issues" integer,
	"stale_prs" integer,
	"avg_issue_age_days" numeric,
	"avg_pr_age_days" numeric,
	"oldest_issue_days" integer,
	"oldest_pr_days" integer,
	"contributor_count" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_owner" text NOT NULL,
	"github_name" text NOT NULL,
	"github_url" text NOT NULL,
	"default_branch" text,
	"description" text,
	"stars" integer DEFAULT 0,
	"forks" integer DEFAULT 0,
	"watchers" integer DEFAULT 0,
	"open_issues" integer DEFAULT 0,
	"primary_language" text,
	"license" text,
	"repo_size_kb" integer,
	"last_pushed_at" timestamp with time zone,
	"github_created_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scan_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"recommendation" text,
	"source" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scan_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid,
	"status" text DEFAULT 'queued',
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid,
	"deployed_url" text,
	"status" text DEFAULT 'queued',
	"error_message" text,
	"overall_score" integer,
	"activity_score" integer,
	"quality_score" integer,
	"security_score" integer,
	"performance_score" integer,
	"accessibility_score" integer,
	"ai_summary" text,
	"roadmap" jsonb,
	"public_id" text NOT NULL,
	"scan_token" text NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "scans_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "security_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid,
	"possible_secret_count" integer DEFAULT 0,
	"dependency_vulnerability_count" integer DEFAULT 0,
	"critical_vulnerability_count" integer DEFAULT 0,
	"high_vulnerability_count" integer DEFAULT 0,
	"has_security_md" boolean,
	"has_license" boolean,
	"has_lockfile" boolean,
	"raw_result" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "accessibility_results" ADD CONSTRAINT "accessibility_results_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_metrics" ADD CONSTRAINT "quality_metrics_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_metrics" ADD CONSTRAINT "repo_metrics_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_findings" ADD CONSTRAINT "scan_findings_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_jobs" ADD CONSTRAINT "scan_jobs_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_metrics" ADD CONSTRAINT "security_metrics_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;