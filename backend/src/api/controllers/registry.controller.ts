import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';

export class RegistryController {
  public static async getCompanies(req: Request, res: Response, next: NextFunction) {
    try {
      // Support pagination to prevent DoS via massive JSON payload
      const limit = Math.min(Number(req.query.limit) || 100, 1000);
      const offset = Number(req.query.offset) || 0;
      let world_instance_id = req.query.world as string;
      const userId = req.user?.id;
      if (!world_instance_id && userId) {
        const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
        if (character) world_instance_id = character.world_instance_id;
      }
      if (!world_instance_id) {
        const activeInstance = await db('world_instances').where({ status: 'active' }).first();
        if (activeInstance) world_instance_id = activeInstance.id;
      }

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
          'created_at_world_year',
          'created_at_world_month',
          'created_at_world_day'
        )
        .where({ status: 'active', world_instance_id })
        .orderBy('id', 'asc')
        .limit(limit)
        .offset(offset);

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
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
          'created_at_world_year',
          'created_at_world_month',
          'created_at_world_day'
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
