import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError, NotFoundError, BadRequestError } from '../../utils/errors';

export class LogisticsController {

  public static async getProcurement(req: Request, res: Response, next: NextFunction) {
    try {
      const vehicles = await db('procurement_vehicles').select('*');
      const facilities = await db('procurement_facilities').select('*');
      const pools = await db('operation_pools').select('*');

      res.status(200).json({ vehicles, facilities, pools });
    } catch (error) {
      next(error);
    }
  }

  public static async getCompanyLogistics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;

      if (!userId || !companyId) {
        return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
      }

      // Verify ownership
      const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character found', 404, 'NOT_FOUND');

      const company = await db('companies').where({ id: companyId, owner_character_id: character.id }).first();
      if (!company) throw new AppError('Company not found or unauthorized', 404, 'NOT_FOUND');

      const staff = await db('company_staff').where({ company_id: companyId });
      const vehicles = await db('company_vehicles')
        .join('procurement_vehicles', 'company_vehicles.catalog_vehicle_id', 'procurement_vehicles.id')
        .leftJoin('operation_pools', 'company_vehicles.assigned_operation_pool_id', 'operation_pools.id')
        .where('company_vehicles.company_id', companyId)
        .select(
          'company_vehicles.*', 
          'procurement_vehicles.type', 
          'procurement_vehicles.capacity', 
          'procurement_vehicles.monthly_maintenance', 
          'procurement_vehicles.purchase_cost',
          'operation_pools.name as assigned_operation_pool_name'
        );
      const facilities = await db('company_facilities')
        .join('procurement_facilities', 'company_facilities.catalog_facility_id', 'procurement_facilities.id')
        .where('company_facilities.company_id', companyId)
        .select('company_facilities.*', 'procurement_facilities.type');
      const ledger = await db('company_ledger').where({ company_id: companyId }).orderBy('created_at', 'desc').limit(100);

      res.status(200).json({ staff, vehicles, facilities, ledger });
    } catch (error) {
      next(error);
    }
  }

  public static async hireStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      const { role } = req.body;

      if (!userId || !companyId || !role) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No character', 404, 'NOT_FOUND');

        const company = await trx('companies').where({ id: companyId, owner_character_id: character.id }).first();
        if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');

        const existing = await trx('company_staff').where({ company_id: companyId, role }).first();
        if (existing) {
          await trx('company_staff').where({ id: existing.id }).increment('quantity', 1).update({ updated_at: trx.fn.now() });
        } else {
          await trx('company_staff').insert({ company_id: companyId, role, quantity: 1 });
        }
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  public static async fireStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      const { role } = req.body;

      if (!userId || !companyId || !role) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No character', 404, 'NOT_FOUND');

        const company = await trx('companies').where({ id: companyId, owner_character_id: character.id }).first();
        if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');

        const existing = await trx('company_staff').where({ company_id: companyId, role }).first();
        if (!existing || existing.quantity <= 0) {
          throw new AppError('No staff in this role to dismiss', 400, 'BAD_REQUEST');
        }

        await trx('company_staff').where({ id: existing.id }).decrement('quantity', 1).update({ updated_at: trx.fn.now() });
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  public static async purchaseVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      const { catalogVehicleId } = req.body;

      if (!userId || !companyId || !catalogVehicleId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      const result = await db.transaction(async (trx) => {
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No character', 404, 'NOT_FOUND');

        const company = await trx('companies').where({ id: companyId, owner_character_id: character.id }).first();
        if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');

        const catalogItem = await trx('procurement_vehicles').where({ id: catalogVehicleId }).first();
        if (!catalogItem) throw new AppError('Vehicle type not found', 404, 'NOT_FOUND');

        const cost = Number(catalogItem.purchase_cost);
        const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();

        if (Number(finances.available_cash) < cost) {
          throw new AppError('Insufficient company funds', 400, 'INSUFFICIENT_FUNDS');
        }

        const [updatedFinances] = await trx('company_finances')
          .where({ company_id: companyId })
          .decrement('available_cash', cost)
          .returning('*');

        const [vehicle] = await trx('company_vehicles').insert({
          company_id: companyId,
          catalog_vehicle_id: catalogVehicleId,
          condition: 100.0
        }).returning('*');

        // Ledger entry
        const clock = await trx('world_clock').first();
        await trx('company_ledger').insert({
          company_id: companyId,
          game_year: clock?.current_year || 1,
          game_month: clock?.current_month || 1,
          game_day: clock?.current_day || 1,
          entry_type: 'Asset Purchase',
          description: `Purchased ${catalogItem.type}`,
          amount: -cost,
          balance_after: updatedFinances.available_cash
        });

        return { vehicle, available_cash: updatedFinances.available_cash };
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async leaseFacility(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      const { catalogFacilityId } = req.body;

      if (!userId || !companyId || !catalogFacilityId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      const result = await db.transaction(async (trx) => {
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No character', 404, 'NOT_FOUND');

        const company = await trx('companies').where({ id: companyId, owner_character_id: character.id }).first();
        if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');

        const catalogItem = await trx('procurement_facilities').where({ id: catalogFacilityId }).first();
        if (!catalogItem) throw new AppError('Facility type not found', 404, 'NOT_FOUND');

        // Pay first lease month cost immediately
        const cost = Number(catalogItem.lease_cost_per_month);
        const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();

        if (Number(finances.available_cash) < cost) {
          throw new AppError('Insufficient company funds to cover first lease payment', 400, 'INSUFFICIENT_FUNDS');
        }

        const [updatedFinances] = await trx('company_finances')
          .where({ company_id: companyId })
          .decrement('available_cash', cost)
          .returning('*');

        const [facility] = await trx('company_facilities').insert({
          company_id: companyId,
          catalog_facility_id: catalogFacilityId,
          country_id: company.country_id,
          state_id: company.headquarters_state_id
        }).returning('*');

        const clock = await trx('world_clock').first();
        await trx('company_ledger').insert({
          company_id: companyId,
          game_year: clock?.current_year || 1,
          game_month: clock?.current_month || 1,
          game_day: clock?.current_day || 1,
          entry_type: 'Facility Lease',
          description: `First lease payment for ${catalogItem.type}`,
          amount: -cost,
          balance_after: updatedFinances.available_cash
        });

        return { facility, available_cash: updatedFinances.available_cash };
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async assignOperation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      const { vehicleId, poolId } = req.body;

      if (!userId || !companyId || !vehicleId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No character', 404, 'NOT_FOUND');

        const company = await trx('companies').where({ id: companyId, owner_character_id: character.id }).first();
        if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');

        const vehicle = await trx('company_vehicles').where({ id: vehicleId, company_id: companyId }).first();
        if (!vehicle) throw new AppError('Vehicle not found', 404, 'NOT_FOUND');

        if (poolId) {
          const pool = await trx('operation_pools').where({ id: poolId }).first();
          if (!pool) throw new AppError('Pool not found', 404, 'NOT_FOUND');
        }

        await trx('company_vehicles').where({ id: vehicleId }).update({
          assigned_operation_pool_id: poolId || null,
          updated_at: trx.fn.now()
        });
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  public static async processTest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;

      if (!userId || !companyId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      const result = await db.transaction(async (trx) => {
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No character', 404, 'NOT_FOUND');

        const company = await trx('companies').where({ id: companyId, owner_character_id: character.id }).first();
        if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');

        const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();
        const policy = finances.maintenance_policy || 'Standard';

        let policyCostMultiplier = 1.0;
        let policyWearMultiplier = 1.0;
        if (policy === 'Low') {
          policyCostMultiplier = 0.75;
          policyWearMultiplier = 1.25;
        } else if (policy === 'Generous') {
          policyCostMultiplier = 1.25;
          policyWearMultiplier = 0.75;
        }

        // Fetch ALL vehicles (assigned and idle)
        const vehicles = await trx('company_vehicles')
          .join('procurement_vehicles', 'company_vehicles.catalog_vehicle_id', 'procurement_vehicles.id')
          .where('company_vehicles.company_id', companyId)
          .select('company_vehicles.*', 'procurement_vehicles.type', 'procurement_vehicles.monthly_maintenance', 'procurement_vehicles.purchase_cost');

        let totalRevenue = 0;
        let totalMaintenance = 0;
        let totalDepreciation = 0;
        
        for (const v of vehicles) {
          const isAssigned = !!v.assigned_operation_pool_id;
          
          if (isAssigned) {
            const pool = await trx('operation_pools').where({ id: v.assigned_operation_pool_id }).first();
            if (pool) {
              totalRevenue += Number(pool.base_revenue_per_month);
            }
          }

          // Maintenance Cost calculation
          let baseMaint = Number(v.monthly_maintenance);
          let vehicleMaint = isAssigned ? baseMaint : (baseMaint * 0.25);
          vehicleMaint = Math.floor(vehicleMaint * policyCostMultiplier);
          totalMaintenance += vehicleMaint;

          // Condition Wear Calculation
          let baseWear = isAssigned ? 3 : 1;
          let wear = baseWear * policyWearMultiplier;
          
          let oldCondition = Number(v.condition);
          let newCondition = Math.max(0, oldCondition - wear);

          // Value Depreciation
          let purchaseCost = Number(v.purchase_cost);
          let oldValue = purchaseCost * (oldCondition / 100);
          let newValue = purchaseCost * (newCondition / 100);
          totalDepreciation += (oldValue - newValue);

          // Update Vehicle Condition
          await trx('company_vehicles')
            .where({ id: v.id })
            .update({ condition: newCondition, updated_at: trx.fn.now() });
        }

        const netProfit = totalRevenue - totalMaintenance;

        const [updatedFinances] = await trx('company_finances')
          .where({ company_id: companyId })
          .increment('available_cash', netProfit)
          .decrement('company_value', totalDepreciation)
          .update({ last_arc_profit: netProfit })
          .returning('*');

        const clock = await trx('world_clock').first();
        
        if (totalRevenue > 0) {
          await trx('company_ledger').insert({
            company_id: companyId,
            game_year: clock?.current_year || 1,
            game_month: clock?.current_month || 1,
            game_day: clock?.current_day || 1,
            entry_type: 'Revenue',
            description: `Operation Revenue from assigned vehicles`,
            amount: totalRevenue,
            balance_after: Number(finances.available_cash) + totalRevenue
          });
        }
        
        if (totalMaintenance > 0) {
          await trx('company_ledger').insert({
            company_id: companyId,
            game_year: clock?.current_year || 1,
            game_month: clock?.current_month || 1,
            game_day: clock?.current_day || 1,
            entry_type: 'vehicle_maintenance',
            description: `Fleet Maintenance (Policy: ${policy})`,
            amount: -totalMaintenance,
            balance_after: Number(finances.available_cash) + totalRevenue - totalMaintenance
          });
        }

        return { success: true, netProfit, available_cash: updatedFinances.available_cash };
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
