import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filteredBy',
  standalone: true,
})
export class FilteredByPipe implements PipeTransform {
  transform<T>(items: T[] | null, filterCriteria: [string, any]): T[] {
    if (!items) {
      return [];
    }

    const [propertyName, propertyValue] = filterCriteria;

    return items.filter((item) => {
      const value = this.getPropertyValue(item, propertyName);
      return value === propertyValue;
    });
  }

  // Méthode pour accéder à une propriété par son nom (gère également les propriétés imbriquées)
  private getPropertyValue(item: any, propertyPath: string): any {
    const properties = propertyPath.split('.');
    return properties.reduce((obj, prop) => {
      return obj && obj[prop] !== undefined ? obj[prop] : undefined;
    }, item);
  }
}
