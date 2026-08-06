import type { PublicQueueItem } from "@/shared/types/public-content";

import styles from "./queue.module.css";

export type QueueTableProps = {
  items: PublicQueueItem[];
  locale: "th" | "en";
};

const copy = {
  en: { deadline: "Deadline", name: "Name", position: "Position", service: "Service", status: "Status" },
  th: { deadline: "กำหนดส่ง", name: "ชื่อ", position: "ลำดับ", service: "บริการ", status: "สถานะ" },
} as const;

function statusTone(status: string) {
  const value = status.toLocaleLowerCase();
  if (value.includes("queue") || value.includes("รอ")) return "waiting";
  if (value.includes("color") || value.includes("สี")) return "color";
  if (value.includes("review") || value.includes("ตรวจ")) return "review";
  if (value.includes("complete") || value.includes("เสร็จ")) return "complete";
  return "sketch";
}

export function QueueTable({ items, locale }: QueueTableProps) {
  const labels = copy[locale];

  return (
    <div className={styles.tableFrame}>
      <table className={styles.queueTable}>
        <colgroup>
          <col className={styles.colPosition} />
          <col className={styles.colName} />
          <col className={styles.colService} />
          <col className={styles.colStatus} />
          <col className={styles.colDeadline} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">{labels.position}</th>
            <th scope="col">{labels.name}</th>
            <th scope="col">{labels.service}</th>
            <th scope="col">{labels.status}</th>
            <th scope="col">{labels.deadline}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => <tr key={`${item.position}-${item.displayName}`}>
            <td data-label={labels.position}><span className={styles.positionMark}>✦</span>{item.position}</td>
            <td data-label={labels.name}><strong>{item.displayName}</strong></td>
            <td data-label={labels.service}>{item.serviceName}</td>
            <td data-label={labels.status}><span className={styles.status} data-tone={statusTone(item.statusLabel)}><i aria-hidden="true" />{item.statusLabel}</span></td>
            <td data-label={labels.deadline}>{item.deadlineLabel}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
  );
}
