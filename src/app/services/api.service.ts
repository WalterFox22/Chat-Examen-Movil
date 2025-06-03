import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private http: HttpClient) {}

  async getPokemon() {
    // Hay 1025 pokémon en la API (junio 2025)
    const randomId = Math.floor(Math.random() * 1025) + 1;
    const url = `https://pokeapi.co/api/v2/pokemon/${randomId}`;
    const res: any = await firstValueFrom(this.http.get(url));
    // Devuelve nombre y sprite
    return {
      name: res.name,
      image: res.sprites.front_default
    };
  }
}
