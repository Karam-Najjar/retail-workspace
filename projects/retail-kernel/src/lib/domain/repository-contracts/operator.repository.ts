import { Operator } from "../models/operator.model";

export interface OperatorRepository {
  getAll(): Promise<readonly Operator[]>;
  getById(id: string): Promise<Operator | undefined>;
}
