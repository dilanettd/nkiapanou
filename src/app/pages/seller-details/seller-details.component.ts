import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'nkiapanou-seller-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './seller-details.component.html',
  styleUrl: './seller-details.component.scss',
})
export class SellerDetailsComponent {}
