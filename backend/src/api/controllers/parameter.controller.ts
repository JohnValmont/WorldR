import { Request, Response, NextFunction } from 'express';
import { parameterRepository } from '../../repositories/parameter.repository';
import { parameterService } from '../../services/parameter.service';
import { ValidationError } from '../../utils/errors';

export class ParameterController {
  public async getGlobalParameters(req: Request, res: Response, next: NextFunction) {
    try {
      const params = await parameterRepository.findAll();
      res.status(200).json(params);
    } catch (error) {
      next(error);
    }
  }

  public async updateGlobalParameter(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, name, value, description } = req.body;
      if (!category || !name || value === undefined) {
        throw new ValidationError('Category, name, and value are required');
      }

      await parameterService.upsertGlobalParameter(category, name, Number(value), description);
      res.status(200).json({ message: `Parameter ${category}:${name} updated successfully` });
    } catch (error) {
      next(error);
    }
  }

  public async getNationParameters(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      const [globals, overrides] = await Promise.all([
        parameterRepository.findAll(),
        parameterRepository.findOverridesByNationId(nation_id)
      ]);

      // Merge overrides into global defaults
      const merged = globals.map(g => {
        const override = overrides.find(o => o.category === g.category && o.name === g.name);
        return {
          category: g.category,
          name: g.name,
          description: g.description,
          default_value: Number(g.value),
          resolved_value: override ? Number(override.value) : Number(g.value),
          is_overridden: !!override
        };
      });

      res.status(200).json(merged);
    } catch (error) {
      next(error);
    }
  }

  public async updateNationOverride(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      const { category, name, value } = req.body;

      if (!category || !name || value === undefined) {
        throw new ValidationError('Category, name, and value are required');
      }

      await parameterService.upsertNationOverride(nation_id, category, name, Number(value));
      res.status(200).json({
        message: `Override for parameter ${category}:${name} on nation ${nation_id} updated successfully`
      });
    } catch (error) {
      next(error);
    }
  }
}
export const parameterController = new ParameterController();
