import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarouselComponent } from '../../shared/components/carousel/carousel/carousel.component';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'nkiapanou-home',
  standalone: true,
  imports: [CommonModule, RouterLink, CarouselComponent, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('600ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '600ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
  ],
})
export class HomeComponent implements OnInit {
  activeTab: string = 'all';

  // Newsletter form
  newsletterForm!: FormGroup;
  isSubmitting: boolean = false;

  // Produits par catégorie
  allProducts: any[] = [];

  // Avis clients
  customerReviews: any[] = [];

  // Catégories
  categories: any[] = [];
  trendingProducts: any[] = [];

  // Section Produits par Catégorie
  productCategories: any[] = [];
  selectedCategory: string = 'decoration';
  categoryProducts: any = {};

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadProducts();
    this.loadReviews();
    this.loadCategories();
    this.loadCategoryProducts();
  }

  initializeForm(): void {
    this.newsletterForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }

  getProductsByCategory(): any[] {
    return this.categoryProducts[this.selectedCategory] || [];
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  getFilteredProducts(): any[] {
    if (this.activeTab === 'all') {
      return this.allProducts;
    }
    return this.allProducts.filter(
      (product) => product.categorySlug === this.activeTab
    );
  }

  getStarClass(rating: number, index: number): string {
    if (index < Math.floor(rating)) {
      return 'lni lni-star-filled';
    } else if (index < rating) {
      return 'lni lni-star-half';
    } else {
      return 'lni lni-star';
    }
  }

  onSubmitNewsletter(): void {
    if (this.newsletterForm.invalid) {
      return;
    }

    this.isSubmitting = true;

    // Simuler un appel API
    setTimeout(() => {
      console.log('Email soumis:', this.newsletterForm.value.email);
      this.isSubmitting = false;
      this.newsletterForm.reset();
      // Ajouter une notification de succès ici
    }, 1500);
  }

  // Méthodes pour charger les données (à remplacer par vos appels API réels)
  private loadProducts(): void {
    // Ces données devraient venir de votre API
    this.allProducts = [
      {
        id: 1,
        name: 'Masque décoratif traditionnel Dogon',
        category: 'Décoration',
        categorySlug: 'decoration',
        price: '35,99',
        rating: 4.0,
        imageUrl: 'assets/images/products/masque-decoratif.jpg',
        badge: 'Nouveau',
      },
      {
        id: 2,
        name: "Mélange d'épices authentiques africaines",
        category: 'Épicerie',
        categorySlug: 'epicerie',
        price: '12,50',
        rating: 4.9,
        imageUrl: 'assets/images/products/epices-melange.jpg',
      },
      {
        id: 3,
        name: 'Robe élégante en tissu wax multicolore',
        category: 'Mode',
        categorySlug: 'mode',
        price: '49,99',
        rating: 4.5,
        imageUrl: 'assets/images/products/robe-wax.jpg',
        badge: 'Soldes',
      },
      {
        id: 4,
        name: 'Bracelet en perles colorées fait main',
        category: 'Bijoux',
        categorySlug: 'bijoux',
        price: '18,75',
        rating: 4.2,
        imageUrl: 'assets/images/products/bracelet-perles.jpg',
      },
      {
        id: 5,
        name: "Statuette en bois d'ébène sculpté à la main",
        category: 'Décoration',
        categorySlug: 'decoration',
        price: '65,00',
        rating: 5.0,
        imageUrl: 'assets/images/products/statue-bois.jpg',
        badge: 'Bestseller',
      },
    ];

    // Définir les produits tendance (les 4 premiers produits)
    this.trendingProducts = this.allProducts.slice(0, 4);
  }

  private loadReviews(): void {
    // Ces données devraient venir de votre API
    this.customerReviews = [
      {
        userName: 'Sophie L.',
        userImage: 'assets/images/testimonials/user-1.jpg',
        rating: 5,
        comment:
          "J'ai acheté plusieurs bijoux et une robe en wax, la qualité est exceptionnelle ! Les couleurs sont vibrantes et l'artisanat est magnifique. Livraison rapide et emballage soigné. Je recommande vivement !",
        productName: 'Robe wax multicolore',
      },
      {
        userName: 'Marc D.',
        userImage: 'assets/images/testimonials/user-2.jpg',
        rating: 4,
        comment:
          "Les épices que j'ai commandées ont transformé ma cuisine ! L'authenticité des saveurs est incroyable. Le parfum qui s'en dégage est envoûtant. Service client très réactif quand j'ai eu une question.",
        productName: "Mélange d'épices africaines",
      },
      {
        userName: 'Amélie T.',
        userImage: 'assets/images/testimonials/user-3.jpg',
        rating: 4.5,
        comment:
          "Ma statuette en bois d'ébène est devenue la pièce maîtresse de mon salon. Le travail artisanal est impressionnant, on sent tout le savoir-faire derrière. Très heureuse de mon achat !",
        productName: "Statuette en bois d'ébène",
      },
    ];
  }

  private loadCategories(): void {
    // Ces données devraient venir de votre API
    this.categories = [
      {
        name: 'Décorations',
        description:
          "Masques, statues et objets d'art pour embellir votre intérieur",
        imageUrl: 'assets/images/categories/decorations.jpg',
        link: '/decorations',
      },
      {
        name: 'Épicerie',
        description: 'Épices, thés et produits alimentaires authentiques',
        imageUrl: 'assets/images/categories/epicerie.jpg',
        link: '/groceries',
      },
      {
        name: 'Mode',
        description: 'Vêtements et accessoires en wax et tissus traditionnels',
        imageUrl: 'assets/images/categories/mode.jpg',
        link: '/fashion',
      },
      {
        name: 'Bijoux',
        description:
          'Bijoux artisanaux en perles, métaux et matériaux naturels',
        imageUrl: 'assets/images/categories/bijoux.jpg',
        link: '/jewelry',
      },
    ];
  }

  private loadCategoryProducts(): void {
    // Définir les catégories de produits
    this.productCategories = [
      { name: 'Décorations', slug: 'decoration' },
      { name: 'Épicerie', slug: 'epicerie' },
      { name: 'Mode', slug: 'mode' },
      { name: 'Bijoux', slug: 'bijoux' },
    ];

    // Produits par catégorie (à remplacer par vos appels API)
    this.categoryProducts = {
      decoration: [
        {
          id: 5,
          name: 'Masque décoratif traditionnel Dogon',
          category: 'Décoration',
          price: '35,99',
          rating: 4.0,
          imageUrl: 'assets/images/products/masque-decoratif.jpg',
          badge: 'Nouveau',
        },
        {
          id: 6,
          name: "Statuette en bois d'ébène sculpté à la main",
          category: 'Décoration',
          price: '65,00',
          rating: 5.0,
          imageUrl: 'assets/images/products/statue-bois.jpg',
          badge: 'Bestseller',
        },
        {
          id: 7,
          name: 'Tableau peinture acrylique motifs africains',
          category: 'Décoration',
          price: '89,90',
          rating: 4.8,
          // Utilisez un chemin d'image qui existe certainement dans votre projet
          imageUrl: 'assets/images/products/masque-decoratif.jpg',
        },
        {
          id: 8,
          name: 'Vase en terre cuite peint à la main',
          category: 'Décoration',
          price: '42,50',
          rating: 4.3,
          // Utilisez un chemin d'image qui existe certainement dans votre projet
          imageUrl: 'assets/images/products/statue-bois.jpg',
        },
        {
          id: 9,
          name: 'Coussin décoratif en tissu wax',
          category: 'Décoration',
          price: '24,99',
          rating: 4.7,
          // Utilisez un chemin d'image qui existe certainement dans votre projet
          imageUrl: 'assets/images/products/masque-decoratif.jpg',
          badge: 'Promo',
        },
      ],
      epicerie: [
        {
          id: 10,
          name: "Mélange d'épices africaines authentiques",
          category: 'Épicerie',
          price: '12,50',
          rating: 4.9,
          imageUrl: 'assets/images/products/epices-melange.jpg',
        },
        {
          id: 11,
          name: 'Thé vert à la menthe du Maroc',
          category: 'Épicerie',
          price: '8,75',
          rating: 4.6,
          imageUrl: 'assets/images/products/epices-melange.jpg',
        },
        {
          id: 12,
          name: 'Poudre de baobab bio 200g',
          category: 'Épicerie',
          price: '15,90',
          rating: 4.5,
          imageUrl: 'assets/images/products/epices-melange.jpg',
          badge: 'Bio',
        },
        {
          id: 13,
          name: "Chocolat artisanal cacao d'Afrique",
          category: 'Épicerie',
          price: '6,50',
          rating: 4.8,
          imageUrl: 'assets/images/products/epices-melange.jpg',
        },
        {
          id: 14,
          name: "Coffret dégustation saveurs d'Afrique",
          category: 'Épicerie',
          price: '45,00',
          rating: 4.9,
          imageUrl: 'assets/images/products/epices-melange.jpg',
          badge: 'Nouveau',
        },
      ],
      mode: [
        {
          id: 15,
          name: 'Robe élégante en tissu wax multicolore',
          category: 'Mode',
          price: '49,99',
          rating: 4.5,
          imageUrl: 'assets/images/products/robe-wax.jpg',
          badge: 'Soldes',
        },
        {
          id: 16,
          name: 'Chemise homme en coton motifs africains',
          category: 'Mode',
          price: '38,75',
          rating: 4.4,
          imageUrl: 'assets/images/products/robe-wax.jpg',
        },
        {
          id: 17,
          name: 'Foulard en soie motifs Kente',
          category: 'Mode',
          price: '22,90',
          rating: 4.6,
          imageUrl: 'assets/images/products/robe-wax.jpg',
        },
        {
          id: 18,
          name: 'Sac à main en tissu wax doublé coton',
          category: 'Mode',
          price: '29,95',
          rating: 4.7,
          imageUrl: 'assets/images/products/robe-wax.jpg',
          badge: 'Nouveau',
        },
        {
          id: 19,
          name: 'Sandales en cuir tressé fait main',
          category: 'Mode',
          price: '59,90',
          rating: 4.3,
          imageUrl: 'assets/images/products/robe-wax.jpg',
        },
      ],
      bijoux: [
        {
          id: 20,
          name: 'Bracelet en perles colorées fait main',
          category: 'Bijoux',
          price: '18,75',
          rating: 4.2,
          imageUrl: 'assets/images/products/bracelet-perles.jpg',
        },
        {
          id: 21,
          name: 'Collier en perles de bois et pierre naturelle',
          category: 'Bijoux',
          price: '35,50',
          rating: 4.7,
          imageUrl: 'assets/images/products/bracelet-perles.jpg',
          badge: 'Exclusif',
        },
        {
          id: 22,
          name: "Boucles d'oreilles en bronze motif tribal",
          category: 'Bijoux',
          price: '24,90',
          rating: 4.8,
          imageUrl: 'assets/images/products/bracelet-perles.jpg',
        },
        {
          id: 23,
          name: 'Bague ajustable en laiton motif éléphant',
          category: 'Bijoux',
          price: '19,95',
          rating: 4.4,
          imageUrl: 'assets/images/products/bracelet-perles.jpg',
        },
        {
          id: 24,
          name: 'Parure complète en perles de verre recyclé',
          category: 'Bijoux',
          price: '65,00',
          rating: 4.9,
          imageUrl: 'assets/images/products/bracelet-perles.jpg',
          badge: 'Artisanal',
        },
      ],
    };
  }
}
