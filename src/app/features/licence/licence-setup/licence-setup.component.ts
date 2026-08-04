import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { Router } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { LicenceValidationService } from "@retail/kernel";
import { NotificationService } from "../../../core/notifications/notification.service";

@Component({
  selector: "app-licence-setup",
  imports: [FormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, TranslatePipe],
  templateUrl: "./licence-setup.component.html",
  styleUrl: "./licence-setup.component.scss",
})
export class LicenceSetupComponent {
  private readonly licenceValidation = inject(LicenceValidationService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  protected licence = "";
  protected readonly error = signal<string | null>(null);
  protected readonly isVerifying = signal(false);

  async verifyAndActivate(): Promise<void> {
    if (!this.licence.trim()) {
      this.error.set("licenceSetup.errors.required");
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
    this.notifications.success("notifications.success.licenceActivated");
    await this.router.navigateByUrl("/dashboard");
  }
}
