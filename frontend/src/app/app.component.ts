import { TuiRoot } from "@taiga-ui/core";
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, TuiRoot],
  template: `
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  // Logic migrated to Dashboard Component
}
