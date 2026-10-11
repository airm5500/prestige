import { Component, HostListener, OnInit, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { Api, Champ, Evenement, Produit, erreursChamps, messageErreur } from './api';
import { prix, urlPdf } from './formats';
import { Selection } from './selection';
import { Session } from './session';

@Component({
  selector: 'ep-fiche',
  imports: [RouterLink],
  template: `
    <main class="page">
      <div class="colonnes">
        <form class="carte formulaire" (submit)="$event.preventDefault(); enregistrer()" novalidate>
          <div class="entre">
            <h1>{{ titre() }}</h1>
            <a routerLink="/catalogue">← Retour au catalogue (Échap)</a>
          </div>
          @if (erreurGenerale()) { <div class="bandeau erreur" role="alert">{{ erreurGenerale() }}</div> }
          @if (quitter()) {
            <div class="bandeau alerte" role="alert">
              <span>Des modifications ne sont pas enregistrées.</span>
              <span class="actions">
                <button type="button" class="bouton" (click)="quitter.set(false)">Continuer la saisie</button>
                <button type="button" class="bouton danger" (click)="partir()">Quitter sans enregistrer</button>
              </span>
            </div>
          }
          <div class="grille-2">
            @for (c of champs(); track c.nom; let i = $index) {
              <div class="champ" [class.plein]="c.nom === 'designation'">
                <label [for]="'f-' + c.nom">{{ c.libelle }}
                  @if (c.obligatoire) { <span class="oblig" aria-hidden="true">*</span> }
                  @if (!c.systeme) { <span class="doux"> (champ importé)</span> }
                </label>
                <input type="text" [id]="'f-' + c.nom" [attr.data-index]="i" [value]="saisie()[c.nom] || ''"
                       [readonly]="c.nom === 'cip' && !!cip()" [class.invalide]="!!erreurs()[c.nom]"
                       [class.nombre]="c.type === 'PRIX' || c.type === 'ENTIER'" autocomplete="off"
                       [attr.aria-invalid]="!!erreurs()[c.nom]" [attr.aria-describedby]="'a-' + c.nom"
                       [attr.aria-required]="c.obligatoire" [attr.inputmode]="c.type === 'PRIX' || c.type === 'ENTIER' || c.type === 'CODE' ? 'numeric' : null"
                       [placeholder]="c.type === 'DATE' ? 'jj/mm/aaaa' : ''"
                       (input)="changer(c.nom, $any($event.target).value)" (keydown.enter)="suivant($event, i)">
                @if (erreurs()[c.nom]) {
                  <span class="msg-erreur" [id]="'a-' + c.nom">{{ erreurs()[c.nom] }}</span>
                } @else {
                  <span class="aide" [id]="'a-' + c.nom">{{ aide(c) }}</span>
                }
              </div>
            }
          </div>
          <div class="entre pied">
            <span class="petit doux">Entrée : champ suivant · Ctrl+S : enregistrer · Échap : retour</span>
            <div class="rangee">
              @if (cip()) {
                @if (confirmer()) {
                  <span class="petit">Supprimer ce produit ?</span>
                  <button type="button" class="bouton danger plein-danger" (click)="supprimer()">Oui, supprimer</button>
                  <button type="button" class="bouton" (click)="confirmer.set(false)">Non</button>
                } @else {
                  <button type="button" class="bouton danger" (click)="confirmer.set(true)">Supprimer…</button>
                }
              }
              <button type="button" class="bouton" (click)="retour()">Annuler</button>
              <button type="submit" class="bouton prim" [disabled]="nbErreurs() > 0 || enCours()">
                {{ nbErreurs() ? 'Enregistrer (' + nbErreurs() + ' erreur' + (nbErreurs() > 1 ? 's' : '') + ' à corriger)' : 'Enregistrer' }}
              </button>
            </div>
          </div>
        </form>

        <aside class="carte apercu">
          <h2>Aperçu de l'étiquette</h2>
          <div class="etiquette" aria-label="Aperçu de l'étiquette">
            <b>{{ apercu()['designation'] || 'DÉSIGNATION' }}</b>
            <svg width="200" height="40" viewBox="0 0 200 40" role="img" aria-label="Code-barres du CIP">
              @for (b of barres(); track $index) { <rect [attr.x]="b[0]" y="0" [attr.width]="b[1]" height="40" fill="#1B2430"></rect> }
            </svg>
            <span class="mono">{{ apercu()['cip'] || '—' }}</span>
            <span>Lot {{ apercu()['lot'] || '—' }} · Pér. {{ apercu()['peremption'] || '—' }}</span>
            <b class="prix">{{ apercu()['prix'] ? prix(apercu()['prix']) + ' ' + monnaie() : '' }}</b>
          </div>
          <div class="petit doux">L'aperçu suit la saisie. Le format (code 1D, DataMatrix, QR) se choisit à l'impression.</div>
          @if (cip()) {
            <div class="rangee">
              <button type="button" class="bouton" (click)="apercuReel()">Aperçu réel (PDF)</button>
              <button type="button" class="bouton" (click)="cocher()">{{ selection.contient(cip()!) ? 'Coché pour l\\'impression ✓' : 'Cocher pour l\\'impression' }}</button>
            </div>
            @if (pdfSur()) {
              <iframe class="pdf" [src]="pdfSur()" title="Aperçu réel de l'étiquette (PDF)"></iframe>
              <a [href]="pdf()" target="_blank" rel="noopener" class="petit">Ouvrir l'aperçu dans un onglet</a>
            }
          }
          @if (produit(); as p) {
            <div class="historique">
              <h2>Historique</h2>
              <ul>
                @for (h of historique(); track $index) {
                  <li>
                    <span class="doux petit">{{ h.quand }} · {{ h.qui || '—' }} · {{ h.source }}</span>
                    @for (e of h.ecarts; track e.champ) {
                      <span class="petit">{{ e.libelle }} : {{ e.avant || '(vide)' }} → {{ e.apres || '(vide)' }}</span>
                    }
                  </li>
                } @empty { <li class="petit doux">Aucune modification.</li> }
              </ul>
            </div>
          }
        </aside>
      </div>
    </main>
  `,
  styles: `
    .formulaire { flex: 999 1 560px; min-width: 0; padding: 24px; gap: 18px; }
    .apercu { flex: 1 1 300px; }
    h1 { font-size: 22px; }
    input.nombre { text-align: right; }
    .pied { border-top: 1px solid var(--ligne); padding-top: 16px; }
    .etiquette { border: 1px dashed var(--bord-fort); border-radius: 6px; padding: 14px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
    .etiquette b { font-size: 14px; }
    .etiquette .prix { font-size: 16px; }
    .pdf { width: 100%; height: 260px; border: 1px solid var(--bord); border-radius: 6px; }
    .historique ul { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .historique li { display: flex; flex-direction: column; gap: 2px; border-top: 1px solid var(--ligne); padding-top: 8px; }
  `,
})
export class Fiche implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly session = inject(Session);
  protected readonly selection = inject(Selection);
  protected readonly prix = prix;
  readonly cip = input<string>();

  protected readonly champs = signal<Champ[]>([]);
  protected readonly produit = signal<Produit | null>(null);
  protected readonly historique = signal<Evenement[]>([]);
  protected readonly saisie = signal<Record<string, string>>({});
  protected readonly apercu = signal<Record<string, string>>({});
  protected readonly erreurs = signal<Record<string, string>>({});
  protected readonly erreurGenerale = signal('');
  protected readonly enCours = signal(false);
  protected readonly confirmer = signal(false);
  protected readonly quitter = signal(false);
  protected readonly monnaie = signal('CFA');
  protected readonly pdf = signal<string | null>(null);
  protected readonly pdfSur = signal<SafeResourceUrl | null>(null);
  private readonly assainir = inject(DomSanitizer);
  private modifie = false;
  private minuterie: ReturnType<typeof setTimeout> | undefined;
  private controleNo = 0;

  protected readonly nbErreurs = computed(() => Object.keys(this.erreurs()).length);
  protected readonly titre = computed(() =>
    this.cip() ? this.produit()?.valeurs['designation'] || this.cip()! : 'Nouveau produit');
  /** Barres decoratives derivees du CIP (l'image exacte se voit dans l'aperçu reel). */
  protected readonly barres = computed(() => {
    const s = (this.apercu()['cip'] || '0000000').split('').map(Number);
    const r: [number, number][] = [];
    let x = 0;
    for (let i = 0; x < 196 && i < 60; i++) {
      const l = 1 + ((s[i % s.length] + i) % 3);
      r.push([x, l]);
      x += l + 1 + ((s[(i + 3) % s.length] + i) % 2) * 2;
    }
    return r;
  });

  async ngOnInit() {
    try {
      const [champs, reglages] = await Promise.all([this.api.champs(), this.api.reglages()]);
      this.champs.set(champs);
      this.monnaie.set((reglages.monnaie || '').trim());
      const cip = this.cip();
      if (cip) {
        const p = await this.api.produit(cip);
        this.produit.set(p);
        this.saisie.set({ ...p.valeurs });
        this.apercu.set({ ...p.valeurs });
        this.historique.set(await this.api.historique(cip));
      } else {
        this.saisie.set({ nombre: '1' });
      }
    } catch (e) {
      this.erreurGenerale.set(messageErreur(e));
    }
    setTimeout(() => (document.querySelector(this.cip() ? '#f-designation' : '#f-cip') as HTMLInputElement | null)?.focus());
  }

  protected aide(c: Champ): string {
    const v = this.saisie()[c.nom] || '';
    switch (c.type) {
      case 'CODE': return c.nom === 'cip' ? (this.cip() ? 'Clé du produit : non modifiable après création' : '7 ou 13 chiffres') : 'Chiffres seulement';
      case 'PRIX': return 'Entier, chiffres seulement';
      case 'ENTIER': return c.nom === 'nombre' ? 'De 1 à 999' : 'Nombre entier';
      case 'DATE': return 'jj/mm/aaaa, ou mm/aaaa (fin du mois)';
      default: return v.length + ' / ' + (c.longueur || 100) + ' caractères' + (c.nom === 'designation' ? ' · mise en majuscules automatique' : '');
    }
  }

  protected changer(nom: string, v: string) {
    this.saisie.set({ ...this.saisie(), [nom]: v });
    this.modifie = true;
    this.quitter.set(false);
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => this.controler(), 250);
  }

  private async controler(): Promise<boolean> {
    const n = ++this.controleNo;
    try {
      const r = await this.api.controler(this.saisie(), this.cip());
      if (n === this.controleNo) {
        this.erreurs.set(r.erreurs);
        this.apercu.set(r.valeurs);
      }
      return Object.keys(r.erreurs).length === 0;
    } catch (e) {
      this.erreurGenerale.set(messageErreur(e));
      return false;
    }
  }

  protected suivant(e: Event, i: number) {
    e.preventDefault();
    const champs = Array.from(document.querySelectorAll('input[data-index]')) as HTMLInputElement[];
    const prochain = champs.slice(i + 1).find((x) => !x.readOnly);
    if (prochain) {
      prochain.focus();
      prochain.select();
    } else {
      this.enregistrer();
    }
  }

  async enregistrer() {
    clearTimeout(this.minuterie);
    if (this.enCours()) return;
    this.enCours.set(true);
    this.erreurGenerale.set('');
    try {
      if (!(await this.controler())) {
        this.erreurGenerale.set('Corrigez les champs signalés en rouge.');
        return;
      }
      const cip = this.cip();
      const p = cip ? await this.api.modifier(cip, this.saisie()) : await this.api.creer(this.saisie());
      this.modifie = false;
      this.session.annoncer(cip ? 'Fiche enregistrée.' : 'Produit ' + p.cip + ' créé.');
      if (cip) {
        this.produit.set(p);
        this.saisie.set({ ...p.valeurs });
        this.historique.set(await this.api.historique(cip));
      } else {
        this.router.navigate(['/produit', p.cip]);
      }
    } catch (e) {
      this.erreurs.set({ ...this.erreurs(), ...erreursChamps(e) });
      this.erreurGenerale.set(messageErreur(e));
    } finally {
      this.enCours.set(false);
    }
  }

  protected retour() {
    if (this.modifie && !this.quitter()) {
      this.quitter.set(true);
      return;
    }
    this.partir();
  }

  protected partir() {
    this.modifie = false;
    this.router.navigate(['/catalogue']);
  }

  @HostListener('document:keydown', ['$event'])
  protected raccourcis(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      this.enregistrer();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.retour();
    }
  }

  protected async supprimer() {
    try {
      await this.api.supprimer([this.cip()!]);
      this.selection.retirer([this.cip()!]);
      this.session.annoncer('Produit supprimé.');
      this.partir();
    } catch (e) {
      this.erreurGenerale.set(messageErreur(e));
    }
  }

  protected cocher() {
    this.selection.basculer(this.cip()!);
  }

  /**
   * Apercu reel : l'etiquette du produit dessinee par le moteur, avec le type de code et la planche reglees (essai de
   * personnalisation : aucun code d'etiquette n'est consomme).
   */
  protected async apercuReel() {
    try {
      const r = await this.api.reglages();
      const d = await this.api.chargerDisposition({ code: r.code, modele: r.modele });
      const b = await this.api.essaiDisposition({ disposition: d.disposition, modele: r.modele, exemple: { cip: this.cip() } });
      const ancien = this.pdf();
      if (ancien) URL.revokeObjectURL(ancien);
      const url = urlPdf(b);
      this.pdf.set(url);
      this.pdfSur.set(this.assainir.bypassSecurityTrustResourceUrl(url + '#toolbar=0&view=FitH'));
    } catch (e) {
      this.erreurGenerale.set(messageErreur(e));
    }
  }
}
