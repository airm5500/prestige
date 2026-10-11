import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Api } from './api';
import { Selection } from './selection';
import { Session } from './session';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (session.utilisateur(); as u) {
      <header class="entete">
        <a routerLink="/catalogue" class="marque">
          <svg width="28" height="28" viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="1" width="38" height="38" rx="8" fill="#0B5E78"></rect><path d="M10 13h20M10 20h20M10 27h12" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"></path></svg>
          Étiquettage Pro
        </a>
        <nav aria-label="Menu principal">
          <a routerLink="/catalogue" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: false }">Catalogue</a>
          <a routerLink="/import" routerLinkActive="actif">Importer</a>
          <a routerLink="/impression" routerLinkActive="actif">Imprimer
            @if (selection.nombre()) { <span class="compte" aria-label="produits cochés">{{ selection.nombre() }}</span> }
          </a>
          <a routerLink="/personnalisation" routerLinkActive="actif">Personnaliser</a>
        </nav>
        <a routerLink="/compte" class="utilisateur" title="Mon compte">{{ u.login }}</a>
        <button type="button" class="lien" (click)="deconnecter()">Se déconnecter</button>
      </header>
      @if (u.motDePasseParDefaut && !masquerConseil) {
        <div class="page conseil">
          <div class="bandeau alerte" role="status">
            <span>Vous utilisez encore le mot de passe d'origine (admin). Vous pouvez le changer quand vous voulez.</span>
            <span class="actions">
              <a routerLink="/compte" class="bouton">Changer le mot de passe</a>
              <button type="button" class="bouton" (click)="masquerConseil = true">Plus tard</button>
            </span>
          </div>
        </div>
      }
    }
    @if (session.message(); as m) {
      <div class="page message">
        <div class="bandeau" [class.ok]="m.genre === 'ok'" [class.erreur]="m.genre === 'erreur'" [class.info]="m.genre === 'info'"
             [attr.role]="m.genre === 'erreur' ? 'alert' : 'status'">
          <span>{{ m.texte }}</span>
          <span class="actions"><button type="button" class="lien" (click)="session.message.set(null)">Fermer</button></span>
        </div>
      </div>
    }
    <router-outlet />
  `,
  styles: `
    .entete { background: #fff; border-bottom: 1px solid var(--bord); padding: 0 24px; min-height: 56px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 24px; }
    .marque { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; font-size: 17px; color: var(--texte); text-decoration: none; }
    nav { display: flex; flex-wrap: wrap; gap: 4px; flex: 1 1 auto; }
    nav a { padding: 8px 12px; border-radius: 6px; text-decoration: none; color: var(--doux); display: inline-flex; gap: 6px; align-items: center; }
    nav a.actif { background: var(--prim-clair); color: var(--prim); font-weight: 600; }
    .compte { background: var(--prim); color: #fff; border-radius: 10px; padding: 0 7px; font-size: 12px; font-weight: 600; }
    .utilisateur { font-size: 14px; color: var(--doux); }
    .conseil, .message { padding-bottom: 0; }
    @media (max-width: 640px) { .entete { padding: 8px 16px; } }
  `,
})
export class App {
  protected readonly session = inject(Session);
  protected readonly selection = inject(Selection);
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  protected masquerConseil = false;

  async deconnecter() {
    try {
      await this.api.deconnexion();
    } finally {
      this.session.utilisateur.set(null);
      this.selection.vider();
      this.router.navigate(['/connexion']);
    }
  }
}
