import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard-placeholder',
  imports: [MatCardModule, TranslatePipe],
  templateUrl: './dashboard-placeholder.component.html',
  styleUrl: './dashboard-placeholder.component.scss',
})
export class DashboardPlaceholderComponent {}
