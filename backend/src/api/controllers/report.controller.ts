import { Request, Response, NextFunction } from 'express';
import { reportService } from '../../services/report.service';

export class ReportController {
  public async getLatestReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      const report = await reportService.getLatestReport(nation_id);
      if (!report) {
        return res.status(200).json({ message: 'No reports available yet. Advance at least one month to generate a report.', report: null });
      }
      res.status(200).json({ report });
    } catch (error) {
      next(error);
    }
  }

  public async getReportHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      const limit = req.query.limit ? Number(req.query.limit) : 12;
      const reports = await reportService.getReportHistory(nation_id, limit);
      res.status(200).json({ reports, count: reports.length });
    } catch (error) {
      next(error);
    }
  }
}
export const reportController = new ReportController();
