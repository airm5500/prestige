import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, messageErreur } from './api';
import { Session } from './session';

@Component({
  selector: 'ep-compte',
  imports: [FormsModule],
  template: `
    <main class="page">
      <h1>Mon compte <span class="sous">· {{ session.utilisateur()?.login }}</span></h1>
      <form class="carte formulaire" (ngSubmit)="changer()" novalidate>
        <h2>Changer le mot de passe</h2>
        <div class="champ">
          <label for="actuel">Mot de passe actuel</label>
          <input id="actuel" name="actuel" type="password" autocomplete="current-password" [(ngModel)]="actuel">
        </div>
        <div class="champ">
          <label for="nouveau">Nouveau mot de passe</label>
          <input id="nouveau" name="nouveau" type="password" autocomplete="new-password" [(ngModel)]="nouveau">
          <span class="aide">6 caractères au moins.</span>
        </div>
        <div class="champ">
          <label for="confirme">Nouveau mot de passe (encore)</label>
          <input id="confirme" name="confirme" type="password" autocomplete="new-password" [(ngModel)]="confirme">
        </div>
        @if (erreur()) { <div class="bandeau erreur" role="alert">{{ erreur() }}</div> }
        <div class="rangee"><button type="submit" class="bouton prim" [disabled]="enCours()">Enregistrer le mot de passe</button></div>
      </form>
      <section class="carte formulaire">
        <h2>Arrêter Étiquettage Pro</h2>
        <p class="petit doux">Ferme l'application et sa base (par exemple avant une mise à jour). Pour la relancer : raccourci « Étiquettage Pro ».</p>
        @if (arrete()) {
          <div class="bandeau ok" role="status">{{ arrete() }} Vous pouvez fermer cet onglet.</div>
        } @else if (confirmerArret()) {
          <div class="bandeau alerte" role="alert">
            <span>Arrêter l'application maintenant ?</span>
            <span class="actions">
              <button type="button" class="bouton danger plein-danger" (click)="arreter()">Oui, arrêter</button>
              <button type="button" class="bouton" (click)="confirmerArret.set(false)">Non</button>
            </span>
          </div>
        } @else {
          <div class="rangee"><button type="button" class="bouton danger" (click)="confirmerArret.set(true)">Arrêter l'application…</button></div>
        }
      </section>
    </main>
  `,
  styles: `.formulaire { max-width: 560px; } p { margin: 0; }`,
})
export class Compte {
  private readonly api = inject(Api);
  protected readonly session = inject(Session);
  protected actuel = '';
  protected nouveau = '';
  protected confirme = '';
  protected readonly erreur = signal('');
  protected readonly enCours = signal(false);
  protected readonly confirmerArret = signal(false);
  protected readonly arrete = signal('');

  async arreter() {
    try {
      this.arrete.set((await this.api.arreter()).message);
      this.session.utilisateur.set(null);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  async changer() {
    this.erreur.set('');
    if (this.nouveau !== this.confirme) {
      this.erreur.set('Les deux saisies du nouveau mot de passe sont différentes.');
      return;
    }
    this.enCours.set(true);
    try {
      await this.api.motDePasse(this.actuel, this.nouveau);
      this.actuel = this.nouveau = this.confirme = '';
      await this.session.charger();
      this.session.annoncer('Mot de passe changé.');
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.enCours.set(false);
    }
  }
}
