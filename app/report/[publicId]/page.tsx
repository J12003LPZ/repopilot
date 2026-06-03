import { notFound } from "next/navigation";
import { getScanByPublicId } from "@/lib/db/queries";
import { toPublicReportPayload } from "@/lib/db/safeScanPayload";
import { PublicReport } from "@/components/report/PublicReport";

export default async function ReportPage(props: PageProps<"/report/[publicId]">) {
  const { publicId } = await props.params;
  const payload = await getScanByPublicId(publicId);
  if (!payload || payload.scan.status !== "complete") notFound();
  return <PublicReport data={toPublicReportPayload(payload)} />;
}
