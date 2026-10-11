import { Component, ElementRef, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, Champ, Filtre, Produit, messageErreur } from './api';
import { etatPeremption, prix } from './formats';
import { Selection } from './selection';
import { Session } from './session';

const COLONNES = 'etiquettage.colonnes';

@Component({
  selector: 'ep-catalogue',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <div class="entre">
        <h1>Catalogue <span class="sous">· {{ total().toLocaleString('fr-FR') }} produit{{ total() > 1 ? 's' : '' }}</span></h1>
        <div class="rangee">
          <a routerLink="/produit/nouveau" class="bouton">Nouveau produit (Ctrl+N)</a>
          <a routerLink="/impression" class="bouton prim" [attr.aria-disabled]="!selection.nombre()"
             (click)="!selection.nombre() && $event.preventDefault()">Imprimer la sélection ({{ selection.nombre() }})</a>
        </div>
      </div>

      <div class="filtres">
        <div class="champ recherche">
          <label for="cherche">Rechercher (CIP, désignation, lot, code géo) — scanner accepté</label>
          <input #cherche id="cherche" type="text" autocomplete="off" [ngModel]="q()" (ngModelChange)="saisir($event)"
                 (keydown)="toucheRecherche($event)" placeholder="Saisir ou scanner">
        </div>
        <div class="champ">
          <label for="per">Péremption</label>
          <select id="per" [ngModel]="peremption()" (ngModelChange)="peremption.set($event); recharger(0)">
            <option value="">Toutes</option>
            <option value="3">Dans moins de 3 mois</option>
            <option value="6">Dans moins de 6 mois</option>
            <option value="depassee">Dépassée</option>
          </select>
        </div>
        <div class="champ">
          <label for="maj">Mis à jour</label>
          <select id="maj" [ngModel]="dernierImport() ? '1' : ''" (ngModelChange)="dernierImport.set($event === '1'); recharger(0)">
            <option value="">Tous</option>
            <option value="1">Dernier import</option>
          </select>
        </div>
      </div>

      @if (erreur()) { <div class="bandeau erreur" role="alert">{{ erreur() }}</div> }

      @if (selection.nombre()) {
        <div class="bandeau info" role="status">
          <span>{{ selection.nombre() }} produit{{ selection.nombre() > 1 ? 's' : '' }} coché{{ selection.nombre() > 1 ? 's' : '' }}.</span>
          <span class="actions">
            @if (confirmerSuppression()) {
              <b>Supprimer {{ selection.nombre() }} produit{{ selection.nombre() > 1 ? 's' : '' }} du catalogue ?</b>
              <button type="button" class="bouton danger plein-danger" (click)="supprimer()">Oui, supprimer</button>
              <button type="button" class="bouton" (click)="confirmerSuppression.set(false)">Non</button>
            } @else {
              <button type="button" class="bouton" (click)="selection.vider()">Tout décocher</button>
              <button type="button" class="bouton danger" (click)="confirmerSuppression.set(true)">Supprimer…</button>
            }
          </span>
        </div>
      }
      @if (total() > produits().length && pageCochee() && total() > selection.nombre()) {
        <div class="bandeau info">
          <span>Les {{ produits().length }} produits de cette page sont cochés.</span>
          <span class="actions"><button type="button" class="lien" (click)="cocherTout()">Cocher les {{ total().toLocaleString('fr-FR') }} produits du filtre</button></span>
        </div>
      }

      <div class="tableau-boite">
        <table class="tableau" (keydown)="toucheTableau($event)">
          <thead>
            <tr>
              <th class="case"><input type="checkbox" aria-label="Cocher les produits de la page" [checked]="pageCochee()"
                  [indeterminate]="!pageCochee() && pagePartielle()" (change)="cocherPage()"></th>
              @for (c of colonnes(); track c.nom) {
                <th [class.droite]="c.type === 'PRIX' || c.type === 'ENTIER'" [attr.aria-sort]="tri() === c.nom ? (sens() === 'asc' ? 'ascending' : 'descending') : null">
                  <button type="button" class="tri" (click)="trier(c.nom)">{{ c.libelle }} {{ tri() === c.nom ? (sens() === 'asc' ? '▲' : '▼') : '' }}</button>
                </th>
              }
              <th><button type="button" class="tri" (click)="trier('modifie')">Modifié {{ tri() === 'modifie' ? (sens() === 'asc' ? '▲' : '▼') : '' }}</button></th>
            </tr>
          </thead>
          <tbody>
            @for (p of produits(); track p.cip; let i = $index) {
              <tr [class.choisie]="selection.contient(p.cip)" [class.active]="i === active()" (click)="active.set(i)">
                <td class="case"><input type="checkbox" [attr.aria-label]="'Cocher ' + (p.valeurs['designation'] || p.cip)"
                    [checked]="selection.contient(p.cip)" (change)="selection.basculer(p.cip)" [attr.data-ligne]="i"></td>
                @for (c of colonnes(); track c.nom) {
                  @switch (c.nom) {
                    @case ('cip') { <td class="mono">{{ p.cip }}</td> }
                    @case ('designation') { <td><a [routerLink]="['/produit', p.cip]">{{ p.valeurs['designation'] }}</a></td> }
                    @default {
                      @if (c.type === 'PRIX') { <td class="droite">{{ prix(p.valeurs[c.nom]) }}</td> }
                      @else if (c.nom === 'peremption' && etat(p.valeurs[c.nom])) {
                        <td><span class="pastille" [class.alerte]="etat(p.valeurs[c.nom]) === 'proche'" [class.erreur]="etat(p.valeurs[c.nom]) === 'depassee'"
                            [title]="etat(p.valeurs[c.nom]) === 'depassee' ? 'Péremption dépassée' : 'Péremption dans moins de 6 mois'">{{ p.valeurs[c.nom] }}</span></td>
                      }
                      @else { <td [class.droite]="c.type === 'ENTIER'">{{ p.valeurs[c.nom] || '—' }}</td> }
                    }
                  }
                }
                <td class="doux">{{ modifie(p) }}</td>
              </tr>
            } @empty {
              <tr><td [attr.colspan]="colonnes().length + 2" class="vide">
                @if (chargement()) { Chargement… }
                @else if (q() || peremption() || dernierImport()) { Aucun produit ne correspond à ces critères. }
                @else { Le catalogue est vide : <a routerLink="/import">importez un fichier</a> ou <a routerLink="/produit/nouveau">créez un produit</a>. }
              </td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="entre petit doux">
        <span>Clavier : ↑ ↓ pour se déplacer, Espace pour cocher, Entrée pour ouvrir la fiche, Ctrl+P pour imprimer la sélection</span>
        @if (total() > taille) {
          <span class="rangee">
            <button type="button" class="bouton" [disabled]="page() === 0" (click)="recharger(page() - 1)">Précédent</button>
            <span>{{ page() * taille + 1 }}–{{ page() * taille + produits().length }} sur {{ total().toLocaleString('fr-FR') }}</span>
            <button type="button" class="bouton" [disabled]="(page() + 1) * taille >= total()" (click)="recharger(page() + 1)">Suivant</button>
          </span>
        }
      </div>

      <details class="colonnes-choix">
        <summary>Colonnes affichées</summary>
        <div class="rangee">
          @for (c of champs(); track c.nom) {
            @if (c.nom !== 'cip' && c.nom !== 'designation') {
              <label class="rangee"><input type="checkbox" [checked]="visible(c)" (change)="basculerColonne(c)"> {{ c.libelle }}</label>
            }
          }
        </div>
      </details>
    </main>
  `,
  styles: `
    .filtres { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
    .filtres .champ { flex: 0 1 200px; }
    .filtres .recherche { flex: 1 1 320px; }
    .filtres label { font-size: 13px; }
    .case { width: 40px; }
    .vide { text-align: center; padding: 32px 12px; color: var(--doux); }
    .colonnes-choix summary { cursor: pointer; color: var(--prim); font-size: 14px; min-height: 32px; }
    .colonnes-choix .rangee { gap: 16px; padding-top: 8px; font-size: 14px; }
  `,
})
export class Catalogue implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(Session);
  protected readonly selection = inject(Selection);
  protected readonly prix = prix;
  protected readonly etat = etatPeremption;
  protected readonly taille = 50;

  protected readonly champs = signal<Champ[]>([]);
  protected readonly produits = signal<Produit[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly q = signal('');
  protected readonly peremption = signal('');
  protected readonly dernierImport = signal(false);
  protected readonly tri = signal('designation');
  protected readonly sens = signal<'asc' | 'desc'>('asc');
  protected readonly active = signal(-1);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal('');
  protected readonly confirmerSuppression = signal(false);
  private readonly choix = signal<Record<string, boolean>>(this.lireChoix());
  private readonly cherche = viewChild<ElementRef<HTMLInputElement>>('cherche');
  private minuterie: ReturnType<typeof setTimeout> | undefined;
  private requete = 0;

  protected readonly colonnes = computed(() =>
    this.champs().filter((c) => c.nom === 'cip' || c.nom === 'designation' || this.visible(c)));
  protected readonly pageCochee = computed(() =>
    this.produits().length > 0 && this.produits().every((p) => this.selection.contient(p.cip)));
  protected readonly pagePartielle = computed(() => this.produits().some((p) => this.selection.contient(p.cip)));

  async ngOnInit() {
    const p = this.route.snapshot.queryParamMap;
    this.dernierImport.set(p.get('dernierImport') === '1');
    this.q.set(p.get('q') || '');
    try {
      this.champs.set(await this.api.champs());
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
    await this.recharger(0);
    this.cherche()?.nativeElement.focus();
  }

  private lireChoix(): Record<string, boolean> {
    try {
      return JSON.parse(localStorage.getItem(COLONNES) || '{}') || {};
    } catch {
      return {};
    }
  }

  protected visible(c: Champ): boolean {
    const v = this.choix()[c.nom];
    return v === undefined ? c.affiche : v;
  }

  protected basculerColonne(c: Champ) {
    const m = { ...this.choix(), [c.nom]: !this.visible(c) };
    this.choix.set(m);
    try {
      localStorage.setItem(COLONNES, JSON.stringify(m));
    } catch {
      /* preference non gardee */
    }
  }

  private filtre(): Filtre {
    return { q: this.q().trim(), peremption: this.peremption(), dernierImport: this.dernierImport(), tri: this.tri(), sens: this.sens() };
  }

  async recharger(page: number) {
    const n = ++this.requete;
    this.chargement.set(true);
    this.confirmerSuppression.set(false);
    try {
      const r = await this.api.produits(this.filtre(), page, this.taille);
      if (n !== this.requete) return;
      this.produits.set(r.produits);
      this.total.set(r.total);
      this.page.set(r.page);
      this.active.set(r.produits.length ? Math.min(Math.max(this.active(), 0), r.produits.length - 1) : -1);
      this.erreur.set('');
    } catch (e) {
      if (n === this.requete) this.erreur.set(messageErreur(e));
    } finally {
      if (n === this.requete) this.chargement.set(false);
    }
  }

  protected saisir(v: string) {
    this.q.set(v);
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => this.recharger(0), 250);
  }

  /** Entree dans la recherche (scan) : un seul produit trouve -> coche, et le champ est vide pour le scan suivant. */
  protected async toucheRecherche(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(this.minuterie);
      await this.recharger(0);
      if (this.produits().length === 1 && this.q().trim()) {
        const p = this.produits()[0];
        this.selection.ajouter([p.cip]);
        this.session.annoncer((p.valeurs['designation'] || p.cip) + ' coché pour l\'impression.');
        this.q.set('');
        await this.recharger(0);
      } else if (this.produits().length === 0) {
        this.session.annoncer('Aucun produit pour « ' + this.q().trim() + ' ».', 'info');
      }
    } else if (e.key === 'ArrowDown' && this.produits().length) {
      e.preventDefault();
      this.focaliserLigne(Math.max(0, this.active()));
    }
  }

  /** Ligne active : le focus passe tout de suite (saisie rapide au clavier), sinon apres l'affichage. */
  private focaliserLigne(i: number) {
    this.active.set(i);
    const ligne = () => document.querySelector('[data-ligne="' + i + '"]') as HTMLElement | null;
    const l = ligne();
    if (l) {
      l.focus();
    } else {
      setTimeout(() => ligne()?.focus());
    }
  }

  protected toucheTableau(e: KeyboardEvent) {
    const n = this.produits().length;
    if (!n) return;
    const i = Math.max(0, this.active());
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.focaliserLigne(Math.min(n - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (i === 0) this.cherche()?.nativeElement.focus();
      else this.focaliserLigne(i - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.router.navigate(['/produit', this.produits()[i].cip]);
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected raccourcis(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      this.router.navigate(['/produit/nouveau']);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      if (this.selection.nombre()) this.router.navigate(['/impression']);
      else this.session.annoncer('Cochez d\'abord les produits à imprimer.', 'info');
    }
  }

  protected trier(nom: string) {
    if (this.tri() === nom) {
      this.sens.set(this.sens() === 'asc' ? 'desc' : 'asc');
    } else {
      this.tri.set(nom);
      this.sens.set(nom === 'modifie' ? 'desc' : 'asc');
    }
    this.recharger(0);
  }

  protected cocherPage() {
    const cips = this.produits().map((p) => p.cip);
    this.pageCochee() ? this.selection.retirer(cips) : this.selection.ajouter(cips);
  }

  protected async cocherTout() {
    try {
      this.selection.ajouter(await this.api.cips(this.filtre()));
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  protected async supprimer() {
    try {
      const r = await this.api.supprimer(this.selection.cips());
      this.selection.vider();
      this.session.annoncer(r.supprimes + ' produit' + (r.supprimes > 1 ? 's' : '') + ' supprimé' + (r.supprimes > 1 ? 's' : '') + '.');
      await this.recharger(this.page());
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  protected modifie(p: Produit): string {
    const quand = (p.modifieLe || p.creeLe || '').slice(0, 10);
    const qui = p.modifieLe ? p.modifiePar : p.creePar;
    return quand ? quand + (qui ? ' · ' + qui : '') : '';
  }
}
