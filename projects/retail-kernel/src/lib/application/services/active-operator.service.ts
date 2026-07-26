import { computed, inject, Injectable, signal } from '@angular/core';
import { Operator } from '../../domain/models/operator.model';
import { DexieOperatorRepository } from '../../data-access/repositories/dexie-operator.repository';
import { DexieSettingsRepository } from '../../data-access/repositories/dexie-settings.repository';

@Injectable({ providedIn: 'root' })
export class ActiveOperatorService {
  private readonly operatorRepository = inject(DexieOperatorRepository);
  private readonly settingsRepository = inject(DexieSettingsRepository);

  readonly operators = signal<readonly Operator[]>([]);
  private readonly activeOperatorId = signal<string | null>(null);
  readonly activeOperator = computed(
    () => this.operators().find((operator) => operator.id === this.activeOperatorId()) ?? null,
  );

  async initialize(): Promise<void> {
    const [operators, settings] = await Promise.all([
      this.operatorRepository.getAll(),
      this.settingsRepository.get(),
    ]);
    this.operators.set(operators);
    this.activeOperatorId.set(settings?.active_operator_id ?? null);
  }

  async setActiveOperator(operatorId: string): Promise<void> {
    const [operator, settings] = await Promise.all([
      this.operatorRepository.getById(operatorId),
      this.settingsRepository.get(),
    ]);

    if (!operator || !settings) {
      throw new Error('The selected operator could not be activated.');
    }

    await this.settingsRepository.save({
      ...settings,
      active_operator_id: operator.id,
      last_modified_by_operator_id: operator.id,
    });
    this.activeOperatorId.set(operator.id);
  }
}
