import { AdminEstimateStatusControls } from "@/features/admin/estimates/components/admin-estimate-status-controls";
import type { AdminEstimateDetail as AdminEstimateDetailModel } from "@/features/admin/estimates/domain/admin-estimate";
import { adminEstimateStatusPresentation } from "@/features/admin/estimates/domain/admin-estimate-status-presentation";
import styles from "@/features/admin/components/admin-section-pages.module.css";

function formatBudget(request: AdminEstimateDetailModel) {
  const format = (satang: number) => `฿${new Intl.NumberFormat("th-TH").format(satang / 100)}`;
  if (request.budgetMinSatang !== null && request.budgetMaxSatang !== null) return `${format(request.budgetMinSatang)} – ${format(request.budgetMaxSatang)}`;
  if (request.budgetMinSatang !== null) return `From ${format(request.budgetMinSatang)}`;
  if (request.budgetMaxSatang !== null) return `Up to ${format(request.budgetMaxSatang)}`;
  return "Not specified";
}

function answerValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function AdminEstimateDetail({ request }: { request: AdminEstimateDetailModel }) {
  const status = adminEstimateStatusPresentation[request.status];

  return <section aria-label={`Estimate detail ${request.requestCode}`} className={styles.detailPanel}>
    <header><div><small>{request.requestCode}</small><h2>{request.customerDisplayName}</h2><p>{request.requesterType === "member" ? "Member" : "Guest"} · {request.contact.kind}: {request.contact.value}</p></div><span className={styles.status} data-tone={status.tone}>● {status.label}</span></header>
    <div className={styles.detailGrid}>
      <section><h3>Submitted brief</h3><dl>
        <div><dt>Category</dt><dd>{request.categoryName.en}</dd></div>
        <div><dt>Service</dt><dd>{request.serviceName.en}</dd></div>
        <div><dt>Usage</dt><dd>{request.usageType === "personal" ? "Personal" : "Commercial"}</dd></div>
        <div><dt>Budget</dt><dd>{formatBudget(request)}</dd></div>
        <div><dt>Deadline</dt><dd>{request.requestedDeadline ?? "Not specified"}</dd></div>
      </dl><h3>Description</h3><p>{request.description}</p><h3>Mood and style</h3><p>{request.moodAndStyle ?? "Not specified"}</p></section>
      <section><h3>Extras</h3><dl>
        <div><dt>Extra characters</dt><dd>{request.extraCharacterCount}</dd></div>
        <div><dt>Background level</dt><dd>{request.backgroundLevel}</dd></div>
        <div><dt>Props</dt><dd>{request.propCount}</dd></div>
      </dl><h3>Request answers</h3><dl>{request.answers.map((answer) => <div key={answer.fieldKey}><dt>{answer.label.en}</dt><dd>{answerValue(answer.value)}</dd></div>)}</dl></section>
    </div>
    <AdminEstimateStatusControls requestId={request.id} status={request.status} />
  </section>;
}
