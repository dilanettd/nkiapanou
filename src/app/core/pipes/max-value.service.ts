import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'max',
  standalone: true,
})
export class MaxValuePipe implements PipeTransform {
  transform(items: any[], property: string): number {
    if (!items || items.length === 0) return 0;

    return Math.max(...items.map((item) => item[property]));
  }
}
