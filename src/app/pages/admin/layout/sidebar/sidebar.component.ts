import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  HostBinding,
  Output,
  EventEmitter,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  private router = inject(Router);

  @Output() collapsedChange = new EventEmitter<boolean>();

  isCollapsed = false;
  @HostBinding('class.collapsed')
  get collapsed() {
    return this.isCollapsed;
  }

  ngOnInit(): void {}

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    localStorage.setItem('sidebarCollapsed', String(this.isCollapsed));
    this.collapsedChange.emit(this.isCollapsed);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
