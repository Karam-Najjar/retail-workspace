import { ErrorHandler, inject, Injectable } from "@angular/core";
import { NotificationService } from "../notifications/notification.service";
import { ErrorLogService } from "./error-log.service";

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notifications = inject(NotificationService);
  private readonly errorLog = inject(ErrorLogService);

  handleError(error: unknown): void {
    this.errorLog.record(error);
    console.error("Unhandled application error.", error);
    this.notifications.error("notifications.errors.unexpected", undefined, "unhandled-application-error");
  }
}
