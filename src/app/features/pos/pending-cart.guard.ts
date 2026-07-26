import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { switchMap } from 'rxjs';
import { PosCartStore } from '@retail/kernel';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmationDialogComponent } from '../../shared-ui/confirmation-dialog/confirmation-dialog.component';
import { PosPageComponent } from './pos-page/pos-page.component';

export const pendingCartGuard: CanDeactivateFn<PosPageComponent> = () => {
  const cart = inject(PosCartStore);
  if (!cart.hasItems()) return true;
  const dialog = inject(MatDialog);
  const translate = inject(TranslateService);
  const dialogRef = dialog.open(ConfirmationDialogComponent, { width: 'min(30rem, calc(100vw - 2rem))' });
  dialogRef.componentRef?.setInput('titleKey', 'pos.leaveTitle');
  dialogRef.componentRef?.setInput('message', String(translate.instant('pos.leaveMessage')));
  return dialogRef.afterClosed().pipe(switchMap(async (confirmed) => {
    if (confirmed !== true) return false;
    await cart.clear();
    return true;
  }));
};
