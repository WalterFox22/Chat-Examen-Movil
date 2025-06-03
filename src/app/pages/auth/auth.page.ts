import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { supabase } from 'src/app/supabase.client';
import { Camera, CameraResultType } from '@capacitor/camera';
import { UserService } from '../../services/user.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
})
export class AuthPage {
  email = '';
  password = '';
  error = '';
  nombre = '';
  fotoUrl = '';

  constructor(private router: Router, private userService: UserService) {}

  async seleccionarFoto() {
    const image = await Camera.getPhoto({ resultType: CameraResultType.DataUrl });
    this.fotoUrl = image.dataUrl!;
  }

  async registrar() {
    try {
      await this.userService.register(this.email, this.password, this.nombre, this.fotoUrl);
      alert('Registro exitoso. Verifica tu email.');
    } catch (err: any) {
      this.error = err.message || 'Error en el registro';
    }
  }

  async login() {
    const { error } = await supabase.auth.signInWithPassword({
      email: this.email,
      password: this.password,
    });
    if (error) this.error = error.message;
    else this.router.navigate(['/chat']);
  }
}