import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';

export class RegistryController {
  public static async getCompanies(req: Request, res: Response, next: NextFunction) {
    try {
      // Returns public data only
      const companies = await db('companies')
        .select(
          'id',
          'name',
          'country_id',
          'headquarters_state_id',
          'industry_id',
          'legal_structure_id',
          'status',
          'reputation',
          'reliability',
          'created_at_world_orbit',
          'created_at_world_arc',
          'created_at_world_mark'
        )
        .where({ status: 'active' });

      res.status(200).json(companies);
    } catch (error) {
      next(error);
    }
  }

  public static async getCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const company = await db('companies')
        .select(
          'id',
          'name',
          'country_id',
          'headquarters_state_id',
          'industry_id',
          'legal_structure_id',
          'status',
          'reputation',
          'reliability',
          'created_at_world_orbit',
          'created_at_world_arc',
          'created_at_world_mark'
        )
        .where({ id })
        .first();

      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      res.status(200).json(company);
    } catch (error) {
      next(error);
    }
  }
}
