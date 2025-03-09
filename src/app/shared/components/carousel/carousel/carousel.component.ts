import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ICarouselSlide {
  category: string;
  badgeColor: string;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  backgroundImage: string;
  textColor: string;
  hoverColor: string;
}

@Component({
  selector: 'nkiapanou-carousel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './carousel.component.html',
  styleUrl: './carousel.component.scss',
})
export class CarouselComponent {
  getIndexArray(): number[] {
    return Array.from({ length: this.slides().length }, (_, i) => i);
  }
  slides = signal<ICarouselSlide[]>([
    {
      category: 'Épicerie Africaine',
      badgeColor: '#F59E0B',
      title: "Saveurs Authentiques d'Afrique",
      description:
        "Découvrez notre sélection d'épices, condiments et ingrédients authentiques pour voyager à travers les saveurs de la cuisine africaine.",
      buttonText: "Explorer l'Épicerie",
      buttonLink: '/categories/epicerie',
      backgroundImage: 'assets/images/home/epice1.png',
      textColor: '#92400E',
      hoverColor: '#D97706',
    },
    {
      category: 'Mode Africaine',
      badgeColor: '#6366F1',
      title: 'Exprimez Votre Style Unique',
      description:
        'Nos vêtements et accessoires allient tradition africaine et tendances modernes, pour un style élégant et authentique au quotidien.',
      buttonText: 'Découvrir la Collection',
      buttonLink: '/categories/mode',
      backgroundImage: 'assets/images/home/mode.png',
      textColor: '#3730A3',
      hoverColor: '#4F46E5',
    },
    {
      category: 'Décorations',
      badgeColor: '#10B981',
      title: "L'Art Africain chez Vous",
      description:
        'Transformez votre intérieur avec nos objets de décoration artisanaux, entre tradition ancestrale et design contemporain.',
      buttonText: 'Embellir votre Espace',
      buttonLink: '/categories/decorations',
      backgroundImage: 'assets/images/home/decoration.png',
      textColor: '#065F46',
      hoverColor: '#059669',
    },
    {
      category: 'Bijoux Africains',
      badgeColor: '#F43F5E',
      title: 'Éclat et Élégance Naturelle',
      description:
        "Nos bijoux artisanaux racontent une histoire, celle d'un savoir-faire transmis de génération en génération pour sublimer votre beauté naturelle.",
      buttonText: 'Explorer les Bijoux',
      buttonLink: '/categories/bijoux',
      backgroundImage: 'assets/images/home/bijoux.png',
      textColor: '#9F1239',
      hoverColor: '#E11D48',
    },
  ]);

  currentSlide = signal<number>(0);
  autoplayInterval: any;

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  startAutoplay(): void {
    this.autoplayInterval = setInterval(() => {
      this.nextSlide();
    }, 9000); // Change de slide toutes les 5 secondes
  }

  stopAutoplay(): void {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
    }
  }

  nextSlide(): void {
    this.currentSlide.update((current) => (current + 1) % this.slides().length);
  }

  prevSlide(): void {
    this.currentSlide.update(
      (current) => (current - 1 + this.slides().length) % this.slides().length
    );
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
    // Réinitialise l'autoplay quand l'utilisateur change manuellement
    this.stopAutoplay();
    this.startAutoplay();
  }
}
