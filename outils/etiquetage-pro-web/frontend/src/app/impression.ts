import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Api, DemandeImpression, Planche, Produit, Reglages, Resume, erreursChamps, messageErreur, messageErreurPdf } from './api';
import { prix, urlPdf } from './formats';
import { Selection } from './selection';
import { Session } from './session';

export const CODES: Record<string, string> = {
  CODE128: 'Code-barres 1D (CIP)',
  DATAMATRIX: 'GS1 DataMatrix (CIP, lot, péremption)',
  QR: 'QR code GS1',
  DATAMATRIX_PLUS: 'DataMatrix+ (toutes les informations, code unique)',
  QR_PLUS: 'QR+ (toutes les informations, code unique)',
};
export const MODELES: Record<string, string> = {
  CARRE_38X21_2: 'A4 — 5 × 13 (38 × 21,2 mm), coins carrés',
  ARRONDI_38X21: 'A4 — 5 × 13 (38 × 21 mm), coins arrondis',
  CARRE_38_1X21_2: 'A4 — 5 × 13 (38,1 × 21,2 mm), colonnes espacées',
  PERSONNALISE: 'Planche personnalisée (réglages ci-dessous)',
};
export const PLANCHE: { nom: string; libelle: string; aide: string; perso?: boolean }[] = [
  { nom: 'colonnes', libelle: 'Colonnes', aide: '1 à 20', perso: true },
  { nom: 'lignes', libelle: 'Lignes', aide: '1 à 40', perso: true },
  { nom: 'largeur', libelle: 'Largeur d\'une étiquette (mm)', aide: '10 à 210', perso: true },
  { nom: 'hauteur', libelle: 'Hauteur d\'une étiquette (mm)', aide: '5 à 297', perso: true },
  { nom: 'espaceH', libelle: 'Espace entre colonnes (mm)', aide: '0 à 50', perso: true },
  { nom: 'espaceV', libelle: 'Espace entre lignes (mm)', aide: '0 à 50', perso: true },
  { nom: 'margeGauche', libelle: 'Marge gauche (mm)', aide: 'vide : planche centrée' },
  { nom: 'margeHaut', libelle: 'Marge haute (mm)', aide: 'vide : planche centrée' },
  { nom: 'decalageX', libelle: 'Décalage horizontal (mm)', aide: '-20 à 20 ; + vers la droite' },
  { nom: 'decalageY', libelle: 'Décalage vertical (mm)', aide: '-20 à 20 ; + vers le bas' },
  { nom: 'echelle', libelle: 'Échelle (%)', aide: '50 à 150 ; 100 par défaut' },
];

@Component({
  selector: 'ep-impression',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      @if (erreur()) { <div class="bandeau erreur" role="alert">{{ erreur() }}</div> }
      <div class="colonnes">
        <section class="carte options">
          <h1>Imprimer {{ selection.nombre() }} produit{{ selection.nombre() > 1 ? 's' : '' }}</h1>
          @if (!selection.nombre()) {
            <div class="bandeau info">Aucun produit coché : cochez-les dans le <a routerLink="/catalogue">catalogue</a> (ou scannez-les dans sa recherche).</div>
          }
          <fieldset>
            <legend>Type de code</legend>
            @for (c of codes; track c[0]) {
              <label class="choix" [class.coche]="code() === c[0]"><input type="radio" name="code" [value]="c[0]" [ngModel]="code()" (ngModelChange)="choisi_ = true; code.set($event); actualiser()"> {{ c[1] }}</label>
            }
          </fieldset>
          <div class="champ">
            <label for="planche">Format de planche</label>
            <select id="planche" [ngModel]="modele()" (ngModelChange)="choisi_ = true; modele.set($event); actualiser()">
              @for (m of modeles; track m[0]) { <option [value]="m[0]">{{ m[1] }}</option> }
            </select>
          </div>
          <div class="grille-2">
            <div class="champ">
              <label for="nb">Étiquettes par produit</label>
              <input id="nb" type="text" inputmode="numeric" [ngModel]="nombre()" (ngModelChange)="nombre.set($event); actualiser()" placeholder="selon la fiche">
              <span class="aide">Vide : le nombre de chaque fiche</span>
            </div>
            <div class="champ">
              <label for="dep">Commencer à la case</label>
              <input id="dep" type="text" inputmode="numeric" [ngModel]="position()" (ngModelChange)="position.set($event); actualiser()">
              <span class="aide">1 à {{ resume()?.parPage || 65 }}</span>
            </div>
            <div class="champ plein">
              <label for="date">Date imprimée (facultatif)</label>
              <input id="date" type="text" [ngModel]="date()" (ngModelChange)="date.set($event)" placeholder="ex. 11/10/2026" maxlength="20">
            </div>
          </div>
          @if (resume(); as r) {
            <div class="petit">
              <b>{{ r.etiquettes.toLocaleString('fr-FR') }} étiquette{{ r.etiquettes > 1 ? 's' : '' }}</b> sur {{ r.pages }} page{{ r.pages > 1 ? 's' : '' }}
              ({{ r.parPage }} par page, {{ dim(r.largeur) }} × {{ dim(r.hauteur) }} mm)
              @if (r.position > 1) { · planche entamée : {{ r.position - 1 }} case{{ r.position > 2 ? 's' : '' }} sautée{{ r.position > 2 ? 's' : '' }} }
            </div>
            @if (r.introuvables.length) { <div class="bandeau alerte">{{ r.introuvables.length }} produit(s) coché(s) ne sont plus au catalogue : {{ r.introuvables.join(', ') }}.</div> }
            @for (a of r.alertes; track a.cip) {
              <div class="bandeau" [class.erreur]="a.erreurs.length" [class.alerte]="!a.erreurs.length">
                <span><b>{{ a.designation || a.cip }}</b> : {{ a.erreurs.concat(a.avertissements).join(' ; ') }}{{ a.erreurs.length ? ' — non imprimé' : '' }}</span>
              </div>
            }
          }
          <div class="rangee">
            <button type="button" class="bouton" (click)="pageDeTest()" [disabled]="enCours()">Page de test</button>
            <button type="button" class="bouton prim large" (click)="imprimer()" [disabled]="!selection.nombre() || enCours() || !resume()?.etiquettes">
              {{ enCours() ? 'Préparation…' : 'Imprimer (PDF)' }}</button>
          </div>
        </section>

        <section class="carte apercu">
          @if (pdfSur()) {
            <div class="entre"><h2>{{ titrePdf() }}</h2>
              <span class="rangee"><a [href]="pdf()" target="_blank" rel="noopener" class="bouton">Ouvrir dans un onglet</a>
              <button type="button" class="bouton" (click)="fermerPdf()">Revenir à l'aperçu</button></span></div>
            <iframe class="pdf" [src]="pdfSur()" [title]="titrePdf()"></iframe>
            <div class="petit doux">Imprimez à 100 % (sans « ajuster à la page ») depuis le lecteur PDF.</div>
          } @else {
            <h2>Aperçu de la planche (page 1)</h2>
            <div class="feuille-fond">
              <div class="feuille" [style.grid-template-columns]="'repeat(' + colonnesPlanche() + ', minmax(0, 1fr))'">
                @for (c of cases(); track $index) {
                  @if (c) {
                    <div class="case pleine"><b>{{ c.designation }}</b><span class="barres"></span><span>{{ c.cip }}{{ c.prix ? ' · ' + c.prix : '' }}</span></div>
                  } @else { <div class="case"></div> }
                }
              </div>
            </div>
            <div class="petit doux">Le dessin exact (codes, polices) se voit dans le PDF et se règle dans <a routerLink="/personnalisation">Personnaliser</a>.</div>
          }
        </section>
      </div>

      <details class="carte reglages" [open]="modele() === 'PERSONNALISE' || reglagesOuverts()">
        <summary><h2>Réglages : pharmacie, planche et calage de l'imprimante</h2></summary>
        <div class="grille-2">
          <div class="champ"><label for="officine">Nom de la pharmacie (sur l'étiquette)</label>
            <input id="officine" type="text" [(ngModel)]="reg.officine" maxlength="60"></div>
          <div class="champ"><label for="monnaie">Monnaie après le prix</label>
            <input id="monnaie" type="text" [(ngModel)]="reg.monnaie" maxlength="8"><span class="aide">ex. CFA, F ; vide : prix seul</span></div>
          <div class="champ"><label for="code-def">Type de code par défaut</label>
            <select id="code-def" [(ngModel)]="reg.code">@for (c of codes; track c[0]) { <option [value]="c[0]">{{ c[1] }}</option> }</select></div>
          <div class="champ"><label for="modele-def">Planche par défaut</label>
            <select id="modele-def" [(ngModel)]="reg.modele">@for (m of modeles; track m[0]) { <option [value]="m[0]">{{ m[1] }}</option> }</select></div>
        </div>
        <div class="grille-3">
          @for (p of planche; track p.nom) {
            @if (!p.perso || reg.modele === 'PERSONNALISE' || modele() === 'PERSONNALISE') {
              <div class="champ">
                <label [for]="'p-' + p.nom">{{ p.libelle }}</label>
                <input type="text" inputmode="decimal" [id]="'p-' + p.nom" [(ngModel)]="reg.planche[p.nom]" [class.invalide]="!!erreursReglages()[p.nom]">
                @if (erreursReglages()[p.nom]) { <span class="msg-erreur">{{ erreursReglages()[p.nom] }}</span> } @else { <span class="aide">{{ p.aide }}</span> }
              </div>
            }
          }
        </div>
        <div class="petit doux">Calage : imprimez la page de test, posez-la sur une planche à contre-jour et corrigez le décalage mesuré.</div>
        <div class="rangee"><button type="button" class="bouton prim" (click)="enregistrerReglages()">Enregistrer les réglages</button></div>
      </details>
    </main>
  `,
  styles: `
    .options { flex: 1 1 360px; }
    .apercu { flex: 999 1 520px; min-width: 0; }
    h1 { font-size: 22px; }
    fieldset { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    legend { font-size: 14px; font-weight: 500; margin-bottom: 8px; }
    .choix { display: flex; gap: 10px; align-items: center; min-height: 40px; padding: 0 12px; border: 1px solid var(--bord-fort); border-radius: 6px; cursor: pointer; }
    .choix.coche { border: 2px solid var(--prim); background: var(--choisi); padding: 0 11px; }
    .large { flex: 1 1 auto; }
    .feuille-fond { background: #e9edf1; border-radius: 6px; padding: 16px; overflow-x: auto; }
    .feuille { background: #fff; width: 100%; max-width: 520px; aspect-ratio: 210 / 297; margin: 0 auto; padding: 4% 3%; display: grid; gap: 2px; align-content: start; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15); }
    .case { border: 1px dashed var(--bord); min-height: 22px; aspect-ratio: 38 / 21; font-size: 6px; overflow: hidden; }
    .case.pleine { border: 1px solid var(--texte); padding: 2px; display: flex; flex-direction: column; gap: 1px; line-height: 1.1; }
    .case b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .barres { height: 30%; background: repeating-linear-gradient(90deg, #1b2430 0 1px, #fff 1px 2px, #1b2430 2px 3px, #fff 3px 5px); }
    .pdf { width: 100%; height: 640px; border: 1px solid var(--bord); border-radius: 6px; }
    .reglages summary { cursor: pointer; list-style: revert; }
    .reglages summary h2 { display: inline; }
    .grille-3 { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px 16px; }
  `,
})
export class Impression implements OnInit {
  private readonly api = inject(Api);
  private readonly session = inject(Session);
  private readonly assainir = inject(DomSanitizer);
  protected readonly selection = inject(Selection);
  protected readonly codes = Object.entries(CODES);
  protected readonly modeles = Object.entries(MODELES);
  protected readonly planche = PLANCHE;

  protected readonly code = signal('CODE128');
  protected readonly modele = signal('CARRE_38X21_2');
  protected readonly nombre = signal('');
  protected readonly position = signal('1');
  protected readonly date = signal('');
  protected readonly resume = signal<Resume | null>(null);
  protected readonly produits = signal<Produit[]>([]);
  protected readonly erreur = signal('');
  protected readonly enCours = signal(false);
  protected readonly pdf = signal<string | null>(null);
  protected readonly pdfSur = signal<SafeResourceUrl | null>(null);
  protected readonly titrePdf = signal('');
  protected readonly erreursReglages = signal<Record<string, string>>({});
  protected readonly reglagesOuverts = signal(false);
  protected reg: { officine: string; monnaie: string; code: string; modele: string; planche: Planche } =
    { officine: '', monnaie: 'CFA', code: 'CODE128', modele: 'CARRE_38X21_2', planche: {} };
  private minuterie: ReturnType<typeof setTimeout> | undefined;
  /** vrai des que l'utilisateur a choisi un type de code ou une planche */
  protected choisi_ = false;

  protected readonly colonnesPlanche = computed(() => {
    const r = this.resume();
    if (this.modele() === 'PERSONNALISE') return Math.max(1, Math.min(20, Number(this.reg.planche['colonnes']) || 5));
    return r ? Math.max(1, Math.round(r.parPage / 13)) : 5;
  });

  /** Cases de la premiere page : null = vide (sautee ou libre), sinon l'etiquette. */
  protected readonly cases = computed(() => {
    const r = this.resume();
    const parPage = r?.parPage || 65;
    const depart = Math.max(1, Math.min(parPage, Number(this.position()) || 1));
    const n = Number(this.nombre());
    const l: ({ designation: string; cip: string; prix: string } | null)[] = Array(depart - 1).fill(null);
    for (const p of this.produits()) {
      const fois = this.nombre().trim() && n >= 0 ? n : Number(p.valeurs['nombre'] || 1);
      for (let i = 0; i < fois && l.length < parPage; i++) {
        l.push({ designation: p.valeurs['designation'] || '', cip: p.cip, prix: prix(p.valeurs['prix']) });
      }
    }
    while (l.length < parPage) l.push(null);
    return l;
  });

  protected dim(v: number) {
    return String(v).replace('.', ',');
  }

  async ngOnInit() {
    try {
      const r = await this.api.reglages();
      this.prendreReglages(r);
      if (!this.choisi_) {
        /* reglages par defaut, sauf si l'utilisateur a deja choisi */
        this.code.set(r.code);
        this.modele.set(r.modele);
      }
      const premiers = this.selection.cips().slice(0, 65);
      const p = await Promise.all(premiers.map((c) => this.api.produit(c).catch(() => null)));
      this.produits.set(p.filter((x): x is Produit => !!x));
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
    await this.actualiser(true);
  }

  private prendreReglages(r: Reglages) {
    const planche: Planche = {};
    for (const p of PLANCHE) planche[p.nom] = r.planche[p.nom] ?? '';
    this.reg = { officine: r.officine, monnaie: (r.monnaie || '').trim(), code: r.code, modele: r.modele, planche };
  }

  private demande(): DemandeImpression {
    const d: DemandeImpression = { cips: this.selection.cips(), code: this.code(), modele: this.modele(), date: this.date() };
    const pos = Number(this.position());
    d.position = Number.isInteger(pos) && pos > 0 ? pos : 1;
    const n = Number(this.nombre());
    if (this.nombre().trim() && Number.isInteger(n)) {
      d.nombres = Object.fromEntries(this.selection.cips().map((c) => [c, n]));
    }
    if (this.modele() === 'PERSONNALISE') d.planche = this.plancheSaisie();
    return d;
  }

  private plancheSaisie(): Planche {
    const p: Planche = {};
    for (const [k, v] of Object.entries(this.reg.planche)) if (v !== null && String(v).trim() !== '') p[k] = String(v).trim();
    return p;
  }

  /** Options changees : resume recalcule ; un PDF deja affiche ne correspond plus, l'apercu de la planche revient. */
  protected actualiser(immediat = false) {
    this.fermerPdf();
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(async () => {
      if (!this.selection.nombre()) {
        this.resume.set(null);
        return;
      }
      try {
        this.resume.set(await this.api.resume(this.demande()));
        this.erreur.set('');
      } catch (e) {
        this.erreur.set(messageErreur(e));
      }
    }, immediat ? 0 : 300);
  }

  private montrer(b: Blob, titre: string) {
    this.fermerPdf();
    const url = urlPdf(b);
    this.pdf.set(url);
    this.pdfSur.set(this.assainir.bypassSecurityTrustResourceUrl(url));
    this.titrePdf.set(titre);
  }

  protected fermerPdf() {
    const u = this.pdf();
    if (u) URL.revokeObjectURL(u);
    this.pdf.set(null);
    this.pdfSur.set(null);
  }

  protected async imprimer() {
    this.enCours.set(true);
    this.erreur.set('');
    try {
      this.montrer(await this.api.imprimer(this.demande()), 'Étiquettes (PDF)');
    } catch (e) {
      this.erreur.set(await messageErreurPdf(e));
    } finally {
      this.enCours.set(false);
    }
  }

  protected async pageDeTest() {
    this.enCours.set(true);
    this.erreur.set('');
    try {
      this.montrer(await this.api.pageDeTest(this.modele(), this.modele() === 'PERSONNALISE' ? this.plancheSaisie() : {}), 'Page de test (PDF)');
    } catch (e) {
      this.erreur.set(await messageErreurPdf(e));
    } finally {
      this.enCours.set(false);
    }
  }

  protected async enregistrerReglages() {
    this.erreursReglages.set({});
    try {
      const r = await this.api.enregistrerReglages({ ...this.reg, planche: this.plancheSaisie() });
      this.prendreReglages(r);
      this.session.annoncer('Réglages enregistrés.');
      this.reglagesOuverts.set(true);
      this.actualiser(true);
    } catch (e) {
      this.erreursReglages.set(erreursChamps(e));
      this.erreur.set(messageErreur(e));
    }
  }
}
