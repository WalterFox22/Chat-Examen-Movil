import { Component, OnInit, OnDestroy } from '@angular/core';
import { supabase } from 'src/app/supabase.client';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

import { Geolocation } from '@capacitor/geolocation';
import { MessageService } from '../../services/message.service';
import { Camera, CameraResultType } from '@capacitor/camera';
import { ApiService } from '../../services/api.service';

@Component({
  standalone: true,
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  imports: [CommonModule, IonicModule, FormsModule],
})
export class ChatPage implements OnInit, OnDestroy {
  messages: any[] = [];
  mensajes: any[] = [];
  allMessages: any[] = []; // <--- NUEVO
  newMessage = '';
  user: any = null;
  subscription: any;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private apiService: ApiService
  ) {}

  async ngOnInit() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      this.router.navigate(['/auth']);
      return;
    }
    this.user = data.user;

    await this.loadMessages();
    await this.loadMensajes();
    this.updateAllMessages();

    // Suscripción en tiempo real a nuevos mensajes de texto (Supabase)
    this.subscription = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          this.messages = [...this.messages, payload.new];
          this.updateAllMessages();
        }
      )
      .subscribe();

    // Suscripción a mensajes enriquecidos (Firebase)
    this.messageService.listenFirebaseMessages((msg: any) => {
      this.mensajes = [...this.mensajes, msg];
      this.updateAllMessages();
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
    }
    this.messageService.unsubscribeFirebase();
  }

  async loadMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('content, email, created_at, type, imageUrl, name, photoUrl')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error cargando mensajes:', error);
      return;
    }
    this.messages = data || [];

    // Cargar URLs firmadas para imágenes
    for (const msg of this.messages) {
      if (msg.type === 'image' && msg.imageUrl) {
        msg.imageUrl = await this.getSignedUrl(msg.imageUrl.replace(/^.*\/(chat-images\/.*)$/, '$1'));
      }
      // Para el avatar, si es path, conviértelo a URL pública
      if (msg.photoUrl && !msg.photoUrl.startsWith('http')) {
        msg.photoUrl = supabase.storage.from('avatars').getPublicUrl(msg.photoUrl).data.publicUrl;
      }
    }
    this.updateAllMessages();
  }

  async loadMensajes() {
    this.mensajes = await this.messageService.getFirebaseMessages();
    this.updateAllMessages();
  }

  updateAllMessages() {
    const all = [
      ...this.messages.map(m => ({
        type: 'text',
        text: m.content,
        name: m.name || m.email,
        photoUrl: m.photoUrl || '',
        created_at: m.created_at || new Date().toISOString()
      })),
      ...this.mensajes.map(m => ({
        ...m,
        created_at: m.created_at || new Date().toISOString()
      }))
    ];
    this.allMessages = all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  async sendMessage() {
    if (!this.newMessage.trim()) return;
    await supabase.from('messages').insert({
      content: this.newMessage,
      email: this.user.email,
    });
    this.newMessage = '';
  }

  async logout() {
    await supabase.auth.signOut();
    this.router.navigate(['/auth']);
  }

  async enviarUbicacion() {
    const coords = await Geolocation.getCurrentPosition();
    const lat = coords.coords.latitude;
    const lng = coords.coords.longitude;
    const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    await this.messageService.sendMessage({
      type: 'location',
      mapUrl,
      name: this.user.user_metadata?.name || this.user.email,
      photoUrl: this.user.user_metadata?.photoUrl || '',
      created_at: new Date().toISOString()
    }, 'firebase');
    await this.loadMensajes(); // o this.updateAllMessages();
  }

  async enviarFoto() {
    const image = await Camera.getPhoto({ resultType: CameraResultType.DataUrl });
    const blob = this.dataURLtoBlob(image.dataUrl!);
    // Al subir la imagen:
    const fileName = `chat-images/${Date.now()}.png`;
    await supabase.storage.from('avatars').upload(fileName, blob, { upsert: true });
    // Guarda fileName en el mensaje, no la URL pública
    await this.messageService.sendMessage({
      type: 'image',
      imageUrl: fileName, // <--- aquí va la URL pública
      name: this.user.user_metadata?.name || this.user.email,
      photoUrl: this.user.user_metadata?.photoUrl || '',
      created_at: new Date().toISOString()
    }, 'supabase');
    this.loadMessages(); // o updateAllMessages()
  }

  async enviarApi() {
    try {
      const pokemon = await this.apiService.getPokemon();
      await this.messageService.sendMessage({
        type: 'api',
        text: `¡Te salió el Pokémon: ${pokemon.name}!`,
        image: pokemon.image,
        name: this.user.user_metadata?.name || this.user.email,
        photoUrl: this.user.user_metadata?.photoUrl || '',
        created_at: new Date().toISOString()
      }, 'firebase');
      this.loadMensajes();
    } catch (error) {
      console.error(error);
    }
  }

  /** 
  get allMessages() {
  const all = [
    ...this.messages.map(m => ({
      type: 'text',
      text: m.content,
      name: m.name || m.email,
      photoUrl: m.photoUrl || '',
      created_at: m.created_at || new Date().toISOString()
    })),
    ...this.mensajes.map(m => ({
      ...m,
      created_at: m.created_at || new Date().toISOString()
    }))
  ];
  return all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}
  */

  async getSignedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 60 * 60); // 1 hora
    if (error) {
      console.error(error);
      return '';
    }
    return data.signedUrl;
  }

  private dataURLtoBlob(dataURL: string): Blob {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }
}