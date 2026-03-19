import type { IsoDateTimeString } from "@/lib/datetime/iso";

import type { TicketDetail } from "../types";

export type TimelineEntryType = "followup" | "solution" | "task";

export interface TicketTimelineEntry {
  id: number;
  type: TimelineEntryType;
  content: string;
  date: IsoDateTimeString;
  userId: number;
  userName: string;
  isPrivate: boolean;
  actionTime?: number;
  solutionStatus?: number;
}

export interface TicketWorkflowFlags {
  isNew: boolean;
  isInProgress: boolean;
  isPending: boolean;
  isResolved: boolean;
  isClosed: boolean;
  hasAssignedTechnician: boolean;
}

export interface TicketWorkflowDetail {
  ticket: TicketDetail;
  requesterName: string;
  requesterUserId?: number;
  technicianName: string;
  technicianUserId: number | null;
  groupName: string;
  timeline: TicketTimelineEntry[];
  flags: TicketWorkflowFlags;
}
