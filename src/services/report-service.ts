import { ReportType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const DAY_IN_MS = 24 * 60 * 60 * 1_000;

function resolveReportType(cadenceDays: number): ReportType {
  switch (cadenceDays) {
    case 2:
      return ReportType.TWO_DAY;
    case 7:
      return ReportType.SEVEN_DAY;
    case 21:
      return ReportType.TWENTY_ONE_DAY;
    default:
      return ReportType.SEVEN_DAY;
  }
}

export class ReportService {
  async generateCycleReport(userId: string, cadenceDays: number) {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - cadenceDays * DAY_IN_MS);
    const type = resolveReportType(cadenceDays);

    return prisma.report.create({
      data: {
        userId,
        type,
        periodStart,
        periodEnd,
        summary: `Automated ${cadenceDays}-day progress report`,
        data: {
          cadenceDays,
          generatedAt: periodEnd.toISOString(),
          highlights: [
            'Placeholder analytics until pipeline integration.',
          ],
        },
      },
    });
  }
}

export const reportService = new ReportService();
