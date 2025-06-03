import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  useSupabase = true;

  async register(email: string, password: string, name: string, photoDataUrl: string) {
    let photoUrl = '';
    if (photoDataUrl) {
      const { error } = await supabase.storage.from('avatars').upload(
        `public/${email}.png`,
        this.dataUrlToBlob(photoDataUrl),
        { upsert: true }
      );
      if (error) throw error;
      photoUrl = supabase.storage.from('avatars').getPublicUrl(`public/${email}.png`).data.publicUrl;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, photoUrl } }
    });
    if (error) throw error;
  }

  dataUrlToBlob(dataUrl: string) {
    const arr = dataUrl.split(','), mime = arr[0].match(/:(.*?);/)![1], bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
    return new Blob([u8arr], { type: mime });
  }
}