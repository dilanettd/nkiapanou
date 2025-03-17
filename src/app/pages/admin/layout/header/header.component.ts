import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
  OnDestroy,
  ChangeDetectorRef,
  effect,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { IUser } from '../../../../core/models2/user.model';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'admin-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  animations: [
    trigger('menuAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate(
          '200ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '150ms ease-in',
          style({ opacity: 0, transform: 'translateY(-10px)' })
        ),
      ]),
    ]),
    trigger('notificationPulse', [
      transition('* => true', [
        style({ transform: 'scale(1)' }),
        animate('500ms ease-in-out', style({ transform: 'scale(1.15)' })),
        animate('500ms ease-in-out', style({ transform: 'scale(1)' })),
      ]),
    ]),
  ],
})
export class HeaderComponent implements OnInit, OnDestroy {
  @ViewChild('avatarMenu') avatarMenu!: ElementRef;

  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  me: IUser | null | undefined;
  isMenuOpen = false;
  hasNewNotifications = false;
  isAuthenticated = false;
  private userSubscription: Subscription | null = null;

  constructor() {
    // Utiliser un effet pour surveiller les changements d'état d'authentification
    effect(() => {
      this.isAuthenticated = this.authService.authStatus();

      // Récupérer automatiquement l'utilisateur quand l'authentification change
      if (this.isAuthenticated) {
        this.me = this.authService.currentUser();
      } else {
        this.me = null;
      }
    });
  }

  get userName(): string {
    return this.me?.name || 'Utilisateur';
  }

  get userEmail(): string {
    return this.me?.email || 'utilisateur@exemple.com';
  }

  get userInitials(): string {
    if (!this.me?.name) return 'U';

    const nameParts = this.me.name.split(' ');

    if (nameParts.length >= 2) {
      return (
        nameParts[0][0] + nameParts[nameParts.length - 1][0]
      ).toUpperCase();
    } else {
      return (nameParts[0][0] + (nameParts[0][1] || '')).toUpperCase();
    }
  }

  ngOnInit(): void {
    // Récupérer l'utilisateur à partir du signal currentUser
    this.me = this.authService.currentUser();

    // S'abonner aux changements d'utilisateur
    this.userSubscription = this.authService
      .getUser()
      .subscribe((user: IUser | null) => {
        this.me = user;
        this.cdr.detectChanges();
      });

    // Vérifier si l'utilisateur est authentifié au démarrage
    if (this.authService.isAuthenticated()) {
      // Vous pouvez ajouter une logique pour récupérer les notifications ici
      this.hasNewNotifications = true;
    }
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Vérifier si le clic est en dehors du menu
    if (
      this.isMenuOpen &&
      this.avatarMenu &&
      !this.avatarMenu.nativeElement.contains(event.target as Node)
    ) {
      this.isMenuOpen = false;
      this.cdr.detectChanges();
    }
  }

  toggleAvatarMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  checkNotifications() {
    // Logique pour vérifier les notifications
    this.hasNewNotifications = false;
    // Rediriger vers la page des notifications ou ouvrir un panneau
    this.router.navigateByUrl('/admin/notifications');
  }

  logout() {
    // Utiliser directement la méthode logout du AuthService
    this.authService.logout().subscribe({
      next: (response) => {
        this.isMenuOpen = false;
        this.router.navigateByUrl('/admin/login');
      },
      error: (error) => {
        console.error('Erreur lors de la déconnexion:', error);
        // Même en cas d'erreur, on réinitialise l'interface et on redirige
        this.isMenuOpen = false;
        this.router.navigateByUrl('/admin/login');
      },
      complete: () => {},
    });
  }
}
