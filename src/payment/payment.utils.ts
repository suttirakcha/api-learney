import {
  MockPaymentEvidence,
  MockPaymentSession,
  MockPaymentSessionStatus,
  MockPaymentTransaction,
} from './payment.types';

const DEFAULT_PAYMENT_EVIDENCE: MockPaymentEvidence = {
  latestSession: null,
  transactions: [],
};

const normalizeSession = (
  value: unknown,
  fallbackStatus: MockPaymentSessionStatus,
): MockPaymentSession | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const session = value as Record<string, unknown>;
  const courseIds = Array.isArray(session.courseIds)
    ? session.courseIds.filter((courseId): courseId is string =>
        typeof courseId === 'string',
      )
    : [];

  if (
    typeof session.referenceCode !== 'string' ||
    typeof session.qrCodeValue !== 'string' ||
    typeof session.amount !== 'number' ||
    typeof session.createdAt !== 'string'
  ) {
    return null;
  }

  return {
    referenceCode: session.referenceCode,
    qrCodeValue: session.qrCodeValue,
    amount: session.amount,
    courseIds,
    createdAt: session.createdAt,
    status:
      session.status === 'SUCCESS' || session.status === 'PENDING'
        ? session.status
        : fallbackStatus,
  };
};

const normalizeTransaction = (
  value: unknown,
): MockPaymentTransaction | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const transaction = value as Record<string, unknown>;
  const courseIds = Array.isArray(transaction.courseIds)
    ? transaction.courseIds.filter((courseId): courseId is string =>
        typeof courseId === 'string',
      )
    : [];

  if (
    typeof transaction.referenceCode !== 'string' ||
    typeof transaction.amount !== 'number' ||
    typeof transaction.confirmedAt !== 'string'
  ) {
    return null;
  }

  return {
    referenceCode: transaction.referenceCode,
    amount: transaction.amount,
    courseIds,
    confirmedAt: transaction.confirmedAt,
  };
};

export const parsePaymentEvidence = (
  evidence?: string | null,
): MockPaymentEvidence => {
  if (!evidence) {
    return DEFAULT_PAYMENT_EVIDENCE;
  }

  try {
    const parsed = JSON.parse(evidence) as Record<string, unknown>;
    const latestSession = normalizeSession(parsed.latestSession, 'PENDING');
    const transactions = Array.isArray(parsed.transactions)
      ? parsed.transactions
          .map((transaction) => normalizeTransaction(transaction))
          .filter((transaction): transaction is MockPaymentTransaction =>
            Boolean(transaction),
          )
      : [];

    return {
      latestSession,
      transactions,
    };
  } catch {
    return DEFAULT_PAYMENT_EVIDENCE;
  }
};

export const serializePaymentEvidence = (
  evidence: MockPaymentEvidence,
): string => {
  return JSON.stringify({
    latestSession: evidence.latestSession,
    transactions: evidence.transactions,
  });
};

export const buildMockReferenceCode = (): string => {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MOCK-${Date.now().toString().slice(-6)}-${randomPart}`;
};

export const buildMockQrValue = (
  referenceCode: string,
  amount: number,
  userId: string,
): string => {
  return [
    'LEARNEY-MOCK-PROMPTPAY',
    `REF:${referenceCode}`,
    `AMOUNT:${amount.toFixed(2)}`,
    `USER:${userId}`,
  ].join('|');
};

export const getMockTransactionCount = (
  evidence?: string | null,
  fallbackCount = 0,
): number => {
  const transactionCount = parsePaymentEvidence(evidence).transactions.length;

  if (transactionCount > 0) {
    return transactionCount;
  }

  return fallbackCount;
};
