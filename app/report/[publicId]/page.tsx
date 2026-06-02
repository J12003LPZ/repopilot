import { notFound } from "next/navigation";
import { getScanByPublicId } from "@/lib/db/queries";
import { PublicReport } from "@/components/report/PublicReport";

export default async function ReportPage(props: PageProps<"/report/[publicId]">) {
  const { publicId } = await props.params;
  const payload = await getScanByPublicId(publicId);
  if (!payload || payload.scan.status !== "complete") notFound();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { scanToken, ipHash, ...safeScan } = payload.scan;
  return <PublicReport data={{ ...payload, scan: safeScan }} />;
}
