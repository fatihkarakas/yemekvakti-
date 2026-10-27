import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ToastService } from './core/toast.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected auth = inject(AuthService);
  protected toast = inject(ToastService);
  private router = inject(Router);

  logout() {
    this.auth.logout();
    this.toast.show('Çıkış yapıldı 👋');
  }
}
