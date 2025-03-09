import { Component, Input } from '@angular/core';

@Component({
  selector: 'rounded-avatar',
  standalone: true,
  imports: [],
  templateUrl: './rounded-avatar.component.html',
  styleUrl: './rounded-avatar.component.scss',
})
export class RoundedAvatarComponent {
  @Input() fullName: string = '';
  @Input() size: string = '2.5';

  getInitials(): string {
    const initials = this.fullName
      .split(' ')
      .map((name) => name.charAt(0))
      .join('');
    return initials.toUpperCase();
  }

  getRandomBackgroundColor(): string {
    // Generate a random color based on the fullName
    const hashCode = this.fullName
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hashCode % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }
}
