import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';

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
      const { role, quantity: rawQty } = req.body;

      const VALID_ROLES = ['Driver', 'Dispatcher', 'Mechanic', 'Manager', 'Accountant', 'Mechanic Crew', 'Warehouse Worker', 'Admin Clerk'];
      if (!userId || !companyId || !role) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
      if (!VALID_ROLES.includes(role)) return next(new AppError(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`, 400, 'BAD_REQUEST'));

      const quantity = Math.max(1, Math.floor(Number(rawQty ?? 1)));

      await db.transaction(async (trx) => {
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No character', 404, 'NOT_FOUND');

        const company = await trx('companies').where({ id: companyId, owner_character_id: character.id }).first();
        if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');

        const existing = await trx('company_staff').where({ company_id: companyId, role }).forUpdate().first();
        if (existing) {
          await trx('company_staff').where({ id: existing.id }).increment('quantity', quantity).update({ updated_at: trx.fn.now() });
        } else {
          await trx('company_staff').insert({ company_id: companyId, role, quantity });
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
      const { role, quantity: rawQty } = req.body;

      if (!userId || !companyId || !role) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
      const quantity = Math.max(1, Math.floor(Number(rawQty ?? 1)));

      await db.transaction(async (trx) => {
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No character', 404, 'NOT_FOUND');

        const company = await trx('companies').where({ id: companyId, owner_character_id: character.id }).first();
        if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');

        const existing = await trx('company_staff').where({ company_id: companyId, role }).forUpdate().first();
        if (!existing || existing.quantity <= 0) {
          throw new AppError('No staff in this role to dismiss', 400, 'BAD_REQUEST');
        }

        const dismissed = Math.min(quantity, existing.quantity);
        await trx('company_staff').where({ id: existing.id }).update({ quantity: Math.max(0, existing.quantity - dismissed), updated_at: trx.fn.now() });
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
      const { catalogVehicleId, condition } = req.body;

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
          .update({ updated_at: trx.fn.now() })
          .returning('*');

        const [vehicle] = await trx('company_vehicles').insert({
          company_id: companyId,
          catalog_vehicle_id: catalogVehicleId,
          condition: condition !== undefined ? condition : 100.0
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
      const { catalogFacilityId, stateId } = req.body;

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
          .update({ updated_at: trx.fn.now() })
          .returning('*');

        const [facility] = await trx('company_facilities').insert({
          company_id: companyId,
          catalog_facility_id: catalogFacilityId,
          country_id: company.country_id,
          state_id: stateId || company.headquarters_state_id
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
        const wagePolicy = finances.wage_policy || 'Standard';

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

        // Pre-fetch all operation pools referenced by assigned vehicles in one query.
        // Avoids an N+1 pattern (one DB round-trip per vehicle) inside the transaction loop.
        const assignedPoolIds = [...new Set(
          vehicles
            .filter((v: any) => v.assigned_operation_pool_id)
            .map((v: any) => v.assigned_operation_pool_id)
        )];
        const poolRows = assignedPoolIds.length > 0
          ? await trx('operation_pools').whereIn('id', assignedPoolIds)
          : [];
        const poolMap = new Map((poolRows as any[]).map(p => [p.id, p]));

        let totalRevenue = 0;
        let totalMaintenance = 0;
        let totalDepreciation = 0;
        let totalFleetValue = 0;

        for (const v of vehicles) {
          const isAssigned = !!v.assigned_operation_pool_id;

          if (isAssigned) {
            const pool = poolMap.get(v.assigned_operation_pool_id);
            if (pool) {
              totalRevenue += Number((pool as any).base_revenue_per_month);
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
          totalFleetValue += newValue;

          // Update Vehicle Condition
          await trx('company_vehicles')
            .where({ id: v.id })
            .update({ condition: newCondition, updated_at: trx.fn.now() });
        }

        // Calculate payroll based on wage policy
        const staffRows = await trx('company_staff').where({ company_id: companyId });
        const STAFF_WAGES: Record<string, number> = {
          'Driver': 18000,
          'Dispatcher': 28000,
          'Mechanic': 30000,
          'Manager': 35000,
          'Accountant': 25000,
          'Mechanic Crew': 30000,
          'Warehouse Worker': 22000,
          'Admin Clerk': 20000
        };
        const wagePolicyMultiplier = 
          finances.wage_policy === 'Low' ? 0.8 :
          finances.wage_policy === 'Generous' ? 1.2 :
          finances.wage_policy === 'Premium' ? 1.45 : 1.0;
        let totalPayroll = 0;
        for (const s of staffRows) {
          const wage = STAFF_WAGES[s.role] || 20000;
          totalPayroll += s.quantity * wage * wagePolicyMultiplier;
        }
        totalPayroll = Math.round(totalPayroll);

        const netProfit = totalRevenue - totalMaintenance - totalPayroll;
        // Negative newCash is intentional: it represents an overdrawn balance (de-facto debt).
        const newCash = Number(finances.available_cash) + netProfit;
        
        // Calculate True Book Value (Cash - Debt + Total Fleet Value)
        const trueBookValue = Math.max(0, newCash - Number(finances.debt || 0) + totalFleetValue);

        const [updatedFinances] = await trx('company_finances')
          .where({ company_id: companyId })
          .update({
            available_cash: newCash,
            company_value: trueBookValue,
            last_arc_profit: netProfit,
            updated_at: trx.fn.now()
          })
          .returning('*');

        const clock = await trx('world_clock').first();
        // Track running balance for ledger entries
        let runningBalance = Number(finances.available_cash);
        if (totalRevenue > 0) {
          runningBalance += totalRevenue;
          await trx('company_ledger').insert({
            company_id: companyId,
            game_year: clock?.current_year || 1,
            game_month: clock?.current_month || 1,
            game_day: clock?.current_day || 1,
            entry_type: 'Revenue',
            description: `Operation Revenue from assigned vehicles`,
            amount: totalRevenue,
            balance_after: runningBalance
          });
        }
        
        if (totalMaintenance > 0) {
          runningBalance -= totalMaintenance;
          await trx('company_ledger').insert({
            company_id: companyId,
            game_year: clock?.current_year || 1,
            game_month: clock?.current_month || 1,
            game_day: clock?.current_day || 1,
            entry_type: 'Vehicle Maintenance',
            description: `Fleet Maintenance (Policy: ${policy})`,
            amount: -totalMaintenance,
            balance_after: runningBalance
          });
        }

        if (totalPayroll > 0) {
          runningBalance -= totalPayroll;
          await trx('company_ledger').insert({
            company_id: companyId,
            game_year: clock?.current_year || 1,
            game_month: clock?.current_month || 1,
            game_day: clock?.current_day || 1,
            entry_type: 'Payroll',
            // Use wagePolicy (already normalized with || 'Standard') — avoids 'Policy: null' in ledger
            description: `Staff Payroll (Policy: ${wagePolicy})`,
            amount: -totalPayroll,
            // Pin the final entry to the exact DB value rather than an accumulated float sum
            balance_after: updatedFinances.available_cash
          });
        }

        return { success: true, netProfit, available_cash: updatedFinances.available_cash };
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async performMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, vehicleId } = req.params;
      const { level } = req.body;

      if (!userId || !companyId || !vehicleId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
      if (!['basic', 'full'].includes(level)) {
        return next(new AppError('Invalid maintenance level. Must be "basic" or "full".', 400, 'BAD_REQUEST'));
      }

      const cost    = level === 'basic' ? 5000  : 15000;
      const restore = level === 'basic' ? 10    : 30;

      const result = await db.transaction(async (trx) => {
        // Ownership guard
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No active character found', 404, 'NOT_FOUND');
        const company = await trx('companies').where({ id: companyId, owner_character_id: character.id }).first();
        if (!company) throw new AppError('Company not found or unauthorized', 404, 'NOT_FOUND');

        const vehicle = await trx('company_vehicles').where({ id: vehicleId, company_id: companyId }).first();
        if (!vehicle) throw new AppError('Vehicle not found', 404, 'NOT_FOUND');

        // Lock the row before reading balance to prevent race conditions
        const fin = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();
        if (!fin || Number(fin.available_cash) < cost) throw new AppError('Insufficient funds.', 400, 'INSUFFICIENT_FUNDS');

        const [updatedFin] = await trx('company_finances')
          .where({ company_id: companyId })
          .decrement('available_cash', cost)
          .update({ updated_at: trx.fn.now() })
          .returning('*');

        const newCondition = Math.min(100, Number(vehicle.condition) + restore);
        await trx('company_vehicles').where({ id: vehicleId }).update({ condition: newCondition, updated_at: trx.fn.now() });

        const clock = await trx('world_clock').first();
        await trx('company_ledger').insert({
          company_id: companyId,
          entry_type: 'Expense',
          amount: -cost,
          description: `Manual Vehicle Maintenance (${level})`,
          game_year: clock?.current_year || 1,
          game_month: clock?.current_month || 1,
          game_day: clock?.current_day || 1,
          balance_after: updatedFin.available_cash
        });
        return { success: true, message: `Maintenance completed. Condition restored to ${newCondition}%.` };
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async assignVehicleToContract(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, contractId } = req.params;
      const { vehicleId } = req.body;

      if (!userId || !companyId || !contractId || !vehicleId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      const result = await db.transaction(async (trx) => {
        // Ownership guard
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No active character found', 404, 'NOT_FOUND');
        const company = await trx('companies').where({ id: companyId, owner_character_id: character.id }).first();
        if (!company) throw new AppError('Company not found or unauthorized', 404, 'NOT_FOUND');

        const vehicle = await trx('company_vehicles').where({ id: vehicleId, company_id: companyId }).first();
        if (!vehicle) throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
        // Scope contract lookup to this company to prevent cross-company tampering
        const contract = await trx('company_contracts').where({ id: contractId, company_id: companyId }).first();
        if (!contract) throw new AppError('Contract not found', 404, 'NOT_FOUND');

        await trx('company_vehicles').where({ id: vehicleId }).update({ assigned_contract_id: contractId, updated_at: trx.fn.now() });
        await trx('company_contracts').where({ id: contractId }).update({ status: 'active', assigned_vehicle_id: vehicleId, updated_at: trx.fn.now() });
        return { success: true, message: 'Vehicle assigned.' };
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async acceptDirectContract(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, contractId } = req.params;
      const { contract, vehicleId } = req.body;

      if (!userId || !companyId || !contractId || !vehicleId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
      // Validate required contract fields before opening a transaction
      if (!contract || !contract.title || contract.reward === undefined || contract.penalty === undefined) {
        return next(new AppError('Invalid contract data: title, reward, and penalty are required.', 400, 'BAD_REQUEST'));
      }

      const result = await db.transaction(async (trx) => {
        // Ownership guard
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No active character found', 404, 'NOT_FOUND');
        const ownedCompany = await trx('companies').where({ id: companyId, owner_character_id: character.id }).first();
        if (!ownedCompany) throw new AppError('Company not found or unauthorized', 404, 'NOT_FOUND');

        const vehicle = await trx('company_vehicles').where({ id: vehicleId, company_id: companyId }).first();
        if (!vehicle) throw new AppError('Vehicle not found', 404, 'NOT_FOUND');

        const existingContract = await trx('company_contracts').where({ id: contractId }).first();
        if (!existingContract) {
          await trx('company_contracts').insert({
            id: contractId,
            company_id: companyId,
            title: contract.title,
            issuer_name: contract.issuerName,
            issuer_type: contract.issuerType,
            reward: contract.reward,
            penalty: contract.penalty,
            required_capacity: contract.requiredCapacity,
            duration_months: contract.durationMonths,
            status: 'active',
            assigned_vehicle_id: vehicleId,
            start_month: contract.startMonth,
            start_year: contract.startYear,
            due_month: contract.dueMonth,
            due_year: contract.dueYear
          });
        } else if (existingContract.company_id !== companyId) {
          // Contract exists but belongs to a different company — reject to prevent cross-company hijacking
          throw new AppError('Contract not found', 404, 'NOT_FOUND');
        } else {
          await trx('company_contracts').where({ id: contractId }).update({
            status: 'active',
            assigned_vehicle_id: vehicleId,
            updated_at: trx.fn.now()
          });
        }

        await trx('company_vehicles').where({ id: vehicleId }).update({ assigned_contract_id: contractId, updated_at: trx.fn.now() });
        return { success: true, message: 'Contract accepted.' };
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async resolveContract(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, contractId } = req.params;
      const { result } = req.body;

      if (!userId || !companyId || !contractId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
      if (!['completed', 'failed'].includes(result)) {
        return next(new AppError('Invalid result value. Must be "completed" or "failed".', 400, 'BAD_REQUEST'));
      }

      const txRes = await db.transaction(async (trx) => {
        // Ownership guard
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No active character found', 404, 'NOT_FOUND');
        const company = await trx('companies').where({ id: companyId, owner_character_id: character.id }).first();
        if (!company) throw new AppError('Company not found or unauthorized', 404, 'NOT_FOUND');

        const contract = await trx('company_contracts').where({ id: contractId, company_id: companyId }).first();
        if (!contract) throw new AppError('Contract not found', 404, 'NOT_FOUND');

        // Defensive parse — null/undefined reward or penalty must not produce NaN
        const reward  = Number(contract.reward)  || 0;
        const penalty = Number(contract.penalty) || 0;
        const amount  = result === 'completed' ? reward : -penalty;

        if (amount !== 0) {
          if (amount > 0) {
            await trx('company_finances').where({ company_id: companyId }).increment('available_cash', amount).update({ updated_at: trx.fn.now() });
          } else {
            await trx('company_finances').where({ company_id: companyId }).decrement('available_cash', Math.abs(amount)).update({ updated_at: trx.fn.now() });
          }
        }

        await trx('company_contracts').where({ id: contractId }).update({ status: result, updated_at: trx.fn.now() });
        if (contract.assigned_vehicle_id) {
          await trx('company_vehicles').where({ id: contract.assigned_vehicle_id }).update({ assigned_contract_id: null, updated_at: trx.fn.now() });
        }

        // Re-read balance after cash movement (correct whether amount was 0 or not)
        const updatedFin = await trx('company_finances').where({ company_id: companyId }).first();
        const clock = await trx('world_clock').first();
        await trx('company_ledger').insert({
          company_id: companyId,
          // Use contract result semantics, not amount sign — avoids mis-classifying a zero-penalty failure
          entry_type: result === 'completed' ? 'Revenue' : 'Expense',
          amount,
          description: `Contract ${result}: ${contract.title}`,
          game_year: clock?.current_year || 1,
          game_month: clock?.current_month || 1,
          game_day: clock?.current_day || 1,
          balance_after: updatedFin.available_cash
        });

        return { success: true, message: `Contract ${result}.` };
      });
      res.status(200).json(txRes);
    } catch (error) {
      next(error);
    }
  }
}
