import { Injectable } from "@angular/core";
import { Operator } from "../../../domain/models/operator.model";

export const MAX_OPERATOR_NAME_LENGTH = 100;

export interface UpdateOperatorsInput {
  readonly operatorOne: string;
  readonly operatorTwo: string;
}

export function isValidOperatorName(value: string): boolean {
  const name = value.trim();
  return name.length > 0 && name.length <= MAX_OPERATOR_NAME_LENGTH;
}

@Injectable({ providedIn: "root" })
export class UpdateOperatorsUseCase {
  execute(input: UpdateOperatorsInput, operators: readonly Operator[]): readonly [Operator, Operator] {
    const first = operators.find(operator => operator.slot === 1);
    const second = operators.find(operator => operator.slot === 2);
    if (operators.length !== 2 || !first || !second || first.id === second.id) {
      throw new Error("Settings require exactly one operator in slots 1 and 2.");
    }

    const operatorOne = input.operatorOne.trim();
    const operatorTwo = input.operatorTwo.trim();
    if (!isValidOperatorName(operatorOne) || !isValidOperatorName(operatorTwo)) {
      throw new Error(`Operator names must be between 1 and ${MAX_OPERATOR_NAME_LENGTH} characters.`);
    }

    const now = new Date();
    return [
      { ...first, display_name: operatorOne, updated_at: now },
      { ...second, display_name: operatorTwo, updated_at: now },
    ];
  }
}
