import {
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { IUser } from '../../core/models/auth.state.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'nkiapanou-account',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent implements OnInit {
  @ViewChild('tabContainer') tabContainer!: ElementRef;
  private authService = inject(AuthService);
  userRole: string = 'customer';
  shopName!: string | undefined;
  shopLogoUrl!: string | undefined;

  constructor(private router: Router) {}

  scrollTabs(direction: 'left' | 'right'): void {
    const container = this.tabContainer.nativeElement;
    const scrollAmount = direction === 'left' ? -200 : 200;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }

  ngOnInit(): void {
    this.authService.getUser().subscribe((me: IUser | null) => {
      this.userRole = me!.role;
      if (me?.role === 'seller') {
        const seller = me.seller;
        this.shopName = seller.shop.name;
        this.shopLogoUrl = seller.shop.logo_url;
      }
    });
  }

  isActiveRoute(route: string): boolean {
    return this.router.isActive(route, true);
  }
}
