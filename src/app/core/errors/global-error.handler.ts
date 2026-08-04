import { ErrorHandler, inject, Injectable } from "@angular/core";
import { NotificationService } from "../notifications/notification.service";

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notifications = inject(NotificationService);

  handleError(error: unknown): void {
    console.error("Unhandled application error.", error);
    this.notifications.error("notifications.errors.unexpected", undefined, "unhandled-application-error");
  }
}
