import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LicenceValidationService } from '@retail/kernel';

// Temporary manual-test licence (ES256, expires 2030-01-01):
// eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcm9maWxlX2lkIjoidG9iYWNjb192MSIsImZlYXR1cmVzIjpbImR1YWxfY3VycmVuY3kiLCJjYXJ0b25fYmFyY29kZXMiLCJpbnZlbnRvcnlfYWRqdXN0bWVudHMiXSwic3ViIjoidGVzdC1jdXN0b21lciIsImlhdCI6MTc4NTA0NTk1MiwiZXhwIjoxODkzNDU2MDAwfQ.QwzD3EhALkJ-Q_1aIfD5jUwzfi4qauTWRwBQmiDVxj87QajWeSNik6dOnw4520hdR_fZf3eoBw1st37PyXBerw

@Component({
  selector: 'app-licence-setup',
  imports: [FormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, TranslatePipe],
  templateUrl: './licence-setup.component.html',
  styleUrl: './licence-setup.component.scss',
})
export class LicenceSetupComponent {
  private readonly licenceValidation = inject(LicenceValidationService);
  private readonly router = inject(Router);

  protected licence = '';
  protected readonly error = signal<string | null>(null);
  protected readonly isVerifying = signal(false);

  async verifyAndActivate(): Promise<void> {
    if (!this.licence.trim()) {
      this.error.set('licenceSetup.errors.required');
      return;
    }

    this.isVerifying.set(true);
    this.error.set(null);
    const result = await this.licenceValidation.verifyAndActivate(this.licence);
    this.isVerifying.set(false);

    if (!result.valid) {
      this.error.set(result.error);
      return;
    }
    await this.router.navigateByUrl('/dashboard');
  }
}
