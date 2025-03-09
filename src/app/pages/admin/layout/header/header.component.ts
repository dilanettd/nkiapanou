import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { IUser } from '../../../../core/models/auth.state.model';

@Component({
  selector: 'admin-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  @ViewChild('avatarMenu') avatarMenu!: ElementRef;
  authService = inject(AuthService);
  router = inject(Router);
  me: IUser | null | undefined;
  isMenuOpen = false;
  hasNewNotifications = true;

  get userName(): string {
    return this.me?.name || 'User';
  }

  get userEmail(): string {
    return this.me?.email || 'N/A';
  }

  get userInitials(): string {
    if (!this.me?.name) return 'U';

    const nameParts = this.me.name.split(' ');

    if (nameParts.length >= 2) {
      return (
        nameParts[0][0] + nameParts[nameParts.length - 1][0]
      ).toUpperCase();
    } else {
      return (nameParts[0][0] + (nameParts[0][1] || 'X')).toUpperCase();
    }
  }

  ngOnInit(): void {
    this.authService.getUser().subscribe((user: IUser | null) => {
      this.me = user;
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.avatarMenu.nativeElement.contains(event.target as Node)) {
      this.isMenuOpen = false;
    }
  }

  toggleAvatarMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  logout() {
    this.authService.logout();
    this.isMenuOpen = false;
    this.router.navigateByUrl('/admin/login');
  }
}
