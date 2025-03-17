import {
  Component,
  Input,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnChanges,
  SimpleChanges,
  PLATFORM_ID,
  Inject,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { register } from 'swiper/element/bundle';
import { IProductReview } from '../../../../../core/models2/product.model';

@Component({
  selector: 'nkiapanou-testimonial-carousel',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './testimonial-carousel.component.html',
  styleUrl: './testimonial-carousel.component.scss',
})
export class TestimonialCarouselComponent implements AfterViewInit, OnChanges {
  @Input() reviews: IProductReview[] = [];
  @ViewChild('swiperContainer') swiperContainer!: ElementRef;

  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    // Enregistrer les éléments web Swiper
    if (this.isBrowser) {
      register();
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.initSwiper();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['reviews'] &&
      !changes['reviews'].firstChange &&
      this.swiperContainer?.nativeElement
    ) {
      // Mettre à jour le carousel quand les avis changent
      setTimeout(() => {
        this.updateSwiper();
      });
    }
  }

  private initSwiper(): void {
    if (!this.swiperContainer?.nativeElement) return;

    const swiperEl = this.swiperContainer.nativeElement;

    // Configurer les options sur mesure
    Object.assign(swiperEl, {
      breakpoints: {
        640: {
          slidesPerView: 2,
        },
        1024: {
          slidesPerView: 3,
        },
      },
    });

    // Initialiser Swiper
    swiperEl.initialize();
  }

  private updateSwiper(): void {
    if (!this.swiperContainer?.nativeElement) return;

    const swiperEl = this.swiperContainer.nativeElement;

    if (swiperEl.swiper) {
      swiperEl.swiper.update();
    }
  }

  getStarClass(rating: number, index: number): string {
    return index < rating ? 'lni lni-star-filled' : 'lni lni-star';
  }
}
