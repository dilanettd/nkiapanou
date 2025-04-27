import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private currentLanguageSubject = new BehaviorSubject<string>('en');
  public currentLang$: Observable<string> =
    this.currentLanguageSubject.asObservable();

  private supportedLanguages = ['en', 'fr'];

  constructor(
    private translate: TranslateService,
    private localStorage: LocalStorageService
  ) {}

  /**
   * Initialize the translation service
   */
  init() {
    // Set the default language from browser or use 'en' as fallback
    const browserLang = this.getBrowserLang();
    const savedLang = this.localStorage.retrieve('language');

    // Set default language to English
    this.translate.setDefaultLang('en');

    // Use saved language, browser language if supported, or fallback to English
    const languageToUse =
      savedLang || (this.isSupportedLanguage(browserLang) ? browserLang : 'en');

    this.setLanguage(languageToUse);
  }

  /**
   * Change the current language
   * @param lang Language code
   */
  setLanguage(lang: string): void {
    if (!this.isSupportedLanguage(lang)) {
      lang = 'en'; // Fallback to English if language not supported
    }

    this.translate.use(lang);
    this.localStorage.store('language', lang);
    this.currentLanguageSubject.next(lang);
  }

  /**
   * Get the current active language
   */
  getCurrentLanguage(): string {
    return this.currentLanguageSubject.value;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return this.supportedLanguages;
  }

  /**
   * Check if a language is supported
   * @param lang Language code to check
   */
  private isSupportedLanguage(lang: string): boolean {
    return this.supportedLanguages.includes(lang);
  }

  /**
   * Get the browser language
   */
  private getBrowserLang(): string {
    const browserLang = navigator.language;
    return browserLang ? browserLang.split('-')[0].toLowerCase() : 'en';
  }
}
