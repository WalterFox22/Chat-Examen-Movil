import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton,  } from '@ionic/angular/standalone';
import {supabase} from 'src/app/supabase.client'
import {Router} from '@angular/router'


@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, ]
})
export class HomePage implements OnInit {

  email=''

  constructor(private route: Router) { }





  async ngOnInit() {
    const {data,error}=await supabase.auth.getUser();
    if(error || !data.user){
      this.route.navigate(['/auth'])
    }else{
      this.email=data.user.email || '';

    }
  }

  // PAra cerrar la sesion por si se olvida
  async logout(){
    await supabase.auth.signOut();
    this.route.navigate(['/auth'])
  }

}
