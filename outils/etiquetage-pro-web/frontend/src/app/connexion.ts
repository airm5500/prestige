import { Component, ElementRef, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api, messageErreur } from './api';
import { Session } from './session';

@Component({
  selector: 'ep-connexion',
  imports: [FormsModule],
  template: `
    <div class="fond">
      <div class="boite">
        <div class="titre">
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="1" width="38" height="38" rx="8" fill="#0B5E78"></rect><path d="M10 13h20M10 20h20M10 27h12" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"></path></svg>
          <div>
            <div class="nom">Étiquettage Pro</div>
            <div class="petit doux">Catalogue et impression d'étiquettes</div>
          </div>
        </div>
        <form class="carte" (ngSubmit)="connecter()" novalidate>
          <h1 class="h1">Connexion</h1>
          <div class="champ">
            <label for="login">Identifiant</label>
            <input #champLogin id="login" name="login" autocomplete="username" [(ngModel)]="login" required>
          </div>
          <div class="champ">
            <label for="mdp">Mot de passe</label>
            <input id="mdp" name="mdp" type="password" autocomplete="current-password" [(ngModel)]="motDePasse">
          </div>
          @if (erreur()) {
            <div class="bandeau erreur" role="alert">{{ erreur() }}</div>
          }
          <button type="submit" class="bouton prim" [disabled]="enCours()">
            {{ enCours() ? 'Connexion…' : 'Se connecter (Entrée)' }}
          </button>
          @if (premierLancement()) {
            <div class="bandeau alerte">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path></svg>
              <span>Premier lancement : compte <b>admin / admin</b>. L'application vous proposera de changer ce mot de passe (facultatif).</span>
            </div>
          }
        </form>
        <div class="tres-petit doux entre"><span>Base locale : bd_etiquette</span><span>v{{ version() }}</span></div>
      </div>
    </div>
  `,
  styles: `
    .fond { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 32px 16px; }
    .boite { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 24px; }
    .titre { display: flex; align-items: center; gap: 12px; }
    .nom { font-size: 22px; font-weight: 700; }
    .carte { padding: 28px; gap: 18px; }
    .h1 { font-size: 20px; }
    .bouton.prim { height: 46px; }
  `,
})
export class Connexion implements OnInit {
  private readonly api = inject(Api);
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  readonly retour = input<string>();
  protected login = '';
  protected motDePasse = '';
  protected readonly erreur = signal('');
  protected readonly enCours = signal(false);
  protected readonly premierLancement = signal(false);
  protected readonly version = signal('1.0');
  private readonly champLogin = viewChild<ElementRef<HTMLInputElement>>('champLogin');

  async ngOnInit() {
    this.champLogin()?.nativeElement.focus();
    try {
      const e = await this.api.etat();
      this.premierLancement.set(e.premierLancement);
      this.version.set(e.version);
      if (e.premierLancement && !this.login) {
        this.login = 'admin';
      }
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  async connecter() {
    if (!this.login.trim()) {
      this.erreur.set("Saisissez l'identifiant.");
      return;
    }
    this.enCours.set(true);
    this.erreur.set('');
    try {
      this.session.utilisateur.set(await this.api.connexion(this.login, this.motDePasse));
      this.session.message.set(null);
      const r = this.retour();
      this.router.navigateByUrl(r && r.startsWith('/') && !r.startsWith('//') && !r.startsWith('/connexion') ? r : '/catalogue');
    } catch (e) {
      this.erreur.set(messageErreur(e));
      this.motDePasse = '';
    } finally {
      this.enCours.set(false);
    }
  }
}
