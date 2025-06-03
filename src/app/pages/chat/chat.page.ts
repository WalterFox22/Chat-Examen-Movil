import { Component, OnInit, OnDestroy } from '@angular/core';
import { supabase } from 'src/app/supabase.client';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  imports: [CommonModule, IonicModule, FormsModule],
})
export class ChatPage implements OnInit, OnDestroy {
  messages: any[] = [];
  newMessage = '';
  user: any = null;
  subscription: any;

  constructor(private router: Router) {}

  async ngOnInit() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    this.router.navigate(['/auth']);
    return;
  }
  this.user = data.user;

  await this.loadMessages();

  // Suscripción en tiempo real a nuevos mensajes
  this.subscription = supabase
    .channel('messages-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        // Agrega el nuevo mensaje al array
        this.messages = [...this.messages, payload.new];
      }
    )
    .subscribe();
}
  ngOnDestroy() {
  if (this.subscription) {
    supabase.removeChannel(this.subscription);
  }
}

  async loadMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('content, email, created_at')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error cargando mensajes:', error);
      return;
    }
    this.messages = data || [];
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
}