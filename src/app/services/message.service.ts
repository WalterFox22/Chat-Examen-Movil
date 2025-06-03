import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, onSnapshot, Unsubscribe } from '@angular/fire/firestore';
import { supabase } from '../supabase.client';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private unsubscribe: Unsubscribe | null = null;

  constructor(private firestore: Firestore) { }

  async uploadImage(dataUrl: string, backend: 'supabase' | 'firebase') {
    if (backend === 'supabase') {
      const fileName = `chat-images/${Date.now()}.png`;
      const { error } = await supabase.storage.from('avatars').upload(
        fileName,
        this.dataUrlToBlob(dataUrl),
        { upsert: true }
      );
      if (error) throw error;
      return supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
    } else {
      // Sube a Firebase Storage y retorna URL
      // const storageRef = ref(this.storage, `chat-images/${Date.now()}.png`);
      // await uploadString(storageRef, dataUrl, 'data_url');
      // return await getDownloadURL(storageRef);
      return ''; // Implementa según tu config
    }
  }

  async sendMessage(msg: any, backend: 'supabase' | 'firebase') {
    if (backend === 'firebase') {
      await addDoc(collection(this.firestore, 'firebase'), {
        ...msg,
        created_at: msg.created_at || new Date().toISOString()
      });
    }
    // ...Supabase lógica si la necesitas...
  }

  async getFirebaseMessages() {
    const querySnapshot = await getDocs(collection(this.firestore, 'firebase'));
    return querySnapshot.docs.map(doc => doc.data());
  }

  listenFirebaseMessages(callback: (msg: any) => void) {
    this.unsubscribe = onSnapshot(collection(this.firestore, 'firebase'), (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          callback(change.doc.data());
        }
      });
    });
  }

  unsubscribeFirebase() {
    if (this.unsubscribe) this.unsubscribe();
  }

  dataUrlToBlob(dataUrl: string) {
    const arr = dataUrl.split(','), mime = arr[0].match(/:(.*?);/)![1], bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
    return new Blob([u8arr], { type: mime });
  }
}