export type ExchangeType = "DIRECT" | "CREDIT";

export type ExchangeStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED"
  | "COMPLETED";

export type SessionType = "ONLINE" | "IN_PERSON";

export type SessionStatus =
  | "PROPOSED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export type CreditTransactionType =
  | "EARN"
  | "SPEND"
  | "REFUND"
  | "ADJUSTMENT";

export interface ExchangeRequest {
  id: string;
  senderId: string;
  receiverId: string;
  exchangeType: ExchangeType;
  offeredSkillId: string;
  requestedSkillId: string;
  creditAmount: number;
  message: string;
  status: ExchangeStatus;
  createdAt: any;
  updatedAt: any;
}

export interface Session {
  id: string;
  exchangeRequestId: string;
  teacherId: string;
  learnerId: string;
  skillId: string;
  scheduledAt: any;
  duration: number;
  sessionType: SessionType;
  location?: string;
  meetingLink?: string;
  status: SessionStatus;
  completedBy: string[];
  createdAt: any;
  updatedAt: any;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: CreditTransactionType;
  referenceId: string;
  description: string;
  createdAt: any;
}