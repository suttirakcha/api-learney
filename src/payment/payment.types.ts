import { PaymentStatus } from '@/database/generated/prisma/client';

export type MockPaymentSessionStatus = 'PENDING' | 'SUCCESS';

export type MockPaymentSession = {
  referenceCode: string;
  qrCodeValue: string;
  amount: number;
  courseIds: string[];
  createdAt: string;
  status: MockPaymentSessionStatus;
};

export type MockPaymentTransaction = {
  referenceCode: string;
  amount: number;
  courseIds: string[];
  confirmedAt: string;
};

export type MockPaymentEvidence = {
  latestSession: MockPaymentSession | null;
  transactions: MockPaymentTransaction[];
};

export type MockPaymentSessionResponse = {
  paymentId: string;
  amount: number;
  status: 'PENDING';
  referenceCode: string;
  qrCodeValue: string;
  createdAt: string;
  courseCount: number;
};

export type MockPaymentDetailResponse = {
  paymentId: string;
  paymentStatus: PaymentStatus;
  sessionStatus: MockPaymentSessionStatus | 'EMPTY';
  totalPaid: number;
  latestSession: MockPaymentSession | null;
  transactionCount: number;
};

export type MockPaymentConfirmResponse = {
  paymentId: string;
  status: 'SUCCESS';
  amount: number;
  referenceCode: string;
  confirmedAt: string;
  enrolledCourseCount: number;
};
