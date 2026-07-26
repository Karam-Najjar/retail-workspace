import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { InventoryMovement } from '@retail/kernel';

@Component({ selector: 'app-inventory-movement-history', imports: [DatePipe, TranslatePipe], templateUrl: './inventory-movement-history.component.html', styleUrl: './inventory-movement-history.component.scss' })
export class InventoryMovementHistoryComponent { readonly movements = input.required<readonly InventoryMovement[]>(); }
