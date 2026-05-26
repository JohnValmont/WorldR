import { ActiveModifier } from '../types';

export class ModifierResolver {
  /**
   * Resolves a parameter value by applying all active modifiers to a base parameter value.
   */
  public static resolve(
    baseValue: number,
    modifiers: ActiveModifier[]
  ): number {
    let resolvedValue = baseValue;

    // 1. Process Additive Modifiers
    const additives = modifiers.filter(m => m.modifierType === 'additive');
    for (const add of additives) {
      resolvedValue += Number(add.modifierValue);
    }

    // 2. Process Multiplicative Modifiers
    const multipliers = modifiers.filter(m => m.modifierType === 'multiplier');
    for (const mult of multipliers) {
      resolvedValue *= Number(mult.modifierValue);
    }

    return resolvedValue;
  }
}
