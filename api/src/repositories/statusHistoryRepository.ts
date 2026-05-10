import type { DbClient } from "../db/pool.js";
import type { CandidateStatus } from "../db/schema.js";

export interface StatusHistoryRecord {
  id: string;
  potholeCandidateId: string;
  oldStatus: CandidateStatus | null;
  newStatus: CandidateStatus;
  changedAt: Date;
  note: string | null;
}

export async function insertStatusHistory(
  client: DbClient,
  input: {
    potholeCandidateId: string;
    oldStatus?: CandidateStatus | null;
    newStatus: CandidateStatus;
    note?: string;
  },
): Promise<StatusHistoryRecord> {
  const result = await client.query<StatusHistoryRow>(
    `
      INSERT INTO status_history (pothole_candidate_id, old_status, new_status, note)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [input.potholeCandidateId, input.oldStatus ?? null, input.newStatus, input.note ?? null],
  );

  return mapStatusHistoryRow(result.rows[0]);
}

export async function listStatusHistory(
  client: DbClient,
  potholeCandidateId: string,
): Promise<StatusHistoryRecord[]> {
  const result = await client.query<StatusHistoryRow>(
    `
      SELECT *
      FROM status_history
      WHERE pothole_candidate_id = $1
      ORDER BY changed_at DESC
    `,
    [potholeCandidateId],
  );

  return result.rows.map(mapStatusHistoryRow);
}

interface StatusHistoryRow {
  id: string;
  pothole_candidate_id: string;
  old_status: CandidateStatus | null;
  new_status: CandidateStatus;
  changed_at: Date;
  note: string | null;
}

function mapStatusHistoryRow(row: StatusHistoryRow): StatusHistoryRecord {
  return {
    id: row.id,
    potholeCandidateId: row.pothole_candidate_id,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    changedAt: row.changed_at,
    note: row.note,
  };
}
