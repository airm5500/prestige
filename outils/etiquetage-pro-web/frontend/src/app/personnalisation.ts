import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Api, messageErreur, messageErreurPdf } from './api';
import { urlPdf } from './formats';
import { CODES, MODELES } from './impression';
import { Session } from './session';

interface Placement {
  element: string;
  x: number;
  y: number;
  l: number;
  h: number;
  police: number;
  alignement: 'G' | 'C' | 'D';
  imprime: boolean;
  dansLeCode: boolean;
}
interface Element { id: string; libelle: string; police: number; lignes: number; dansLeCode: boolean; texte: boolean; gras: boolean; }
interface Probleme { element: string; message: string; bloquant: boolean; }

const PT_MM = 25.4 / 72;

@Component({
  selector: 'ep-personnalisation',
  imports: [FormsModule],
  template: `
    <main class="page">
      <div class="entre">
        <h1>Personnaliser l'étiquette</h1>
        <span class="petit doux">Une disposition par type de code et par format d'étiquette ; elle sert à toutes les impressions.</span>
      </div>
      @if (erreur()) { <div class="bandeau erreur" role="alert">{{ erreur() }}</div> }
      <div class="filtres">
        <div class="champ"><label for="p-code">Type de code</label>
          <select id="p-code" [ngModel]="code()" (ngModelChange)="choisi_ = true; code.set($event); charger()">@for (c of codes; track c[0]) { <option [value]="c[0]">{{ c[1] }}</option> }</select></div>
        <div class="champ"><label for="p-modele">Planche</label>
          <select id="p-modele" [ngModel]="modele()" (ngModelChange)="choisi_ = true; modele.set($event); charger()">@for (m of modeles; track m[0]) { <option [value]="m[0]">{{ m[1] }}</option> }</select></div>
        <div class="champ"><label for="p-cip">Produit d'exemple (CIP)</label>
          <input id="p-cip" type="text" inputmode="numeric" [ngModel]="exempleCip()" (ngModelChange)="exempleCip.set($event); controler()" placeholder="exemple par défaut"></div>
      </div>
      @if (info()) { <div class="bandeau info" role="status" [attr.aria-busy]="!charge()">{{ info() }}</div> }

      @if (placements().length) {
        <div class="colonnes">
          <section class="carte dessin">
            <h2>Aperçu ({{ dim(largeur()) }} × {{ dim(hauteur()) }} mm)</h2>
            <div class="fond-dessin">
              <svg [attr.viewBox]="'-0.5 -0.5 ' + (largeur() + 1) + ' ' + (hauteur() + 1)" class="svg" [style.aspect-ratio]="(largeur() + 1) + ' / ' + (hauteur() + 1)"
                   role="img" [attr.aria-label]="'Aperçu de l\\'étiquette ' + dim(largeur()) + ' par ' + dim(hauteur()) + ' millimètres'"
                   tabindex="0" (keydown)="deplacer($event)">
                <rect x="0" y="0" [attr.width]="largeur()" [attr.height]="hauteur()" fill="#fff" stroke="#1B2430" stroke-width="0.15" rx="0.8"></rect>
                @for (p of placements(); track p.element) {
                  @if (p.imprime && !p.dansLeCode && p.l > 0 && p.h > 0) {
                    <g (click)="choisi.set(p.element)" class="el">
                      <rect [attr.x]="p.x" [attr.y]="p.y" [attr.width]="p.l" [attr.height]="p.h" fill="transparent"
                            [attr.stroke]="choisi() === p.element ? '#0B5E78' : (enProbleme(p.element) ? '#B42318' : '#B8C1CB')"
                            [attr.stroke-width]="choisi() === p.element ? 0.3 : 0.1" stroke-dasharray="0.6 0.4"></rect>
                      @if (p.element === 'CODE') {
                        @for (r of modules(p); track $index) {
                          <rect [attr.x]="r[0]" [attr.y]="r[1]" [attr.width]="r[2]" [attr.height]="r[3]" fill="#1B2430"></rect>
                        }
                      } @else {
                        @for (t of lignes(p); track $index) {
                          <text [attr.x]="t.x" [attr.y]="t.y" [attr.font-size]="t.taille" [attr.text-anchor]="t.ancre"
                                [attr.font-weight]="gras(p.element) ? 700 : 400" font-family="Helvetica, Arial, sans-serif" fill="#1B2430">{{ t.texte }}</text>
                        }
                      }
                    </g>
                  }
                }
              </svg>
            </div>
            <div class="petit doux">Cliquez un élément pour le choisir ; flèches du clavier sur l'aperçu : déplacer de 0,5 mm (Maj : 0,1 mm).</div>
            @if (contenuLisible()) { <div class="petit"><b>Contenu du code :</b> <span class="mono">{{ contenuLisible() }}</span></div> }
            @if (valide()) { <div class="bandeau ok">Étiquette lisible sur ce format.</div> }
            @for (p of problemes(); track $index) {
              <div class="bandeau" [class.erreur]="p.bloquant" [class.alerte]="!p.bloquant">{{ libelleDe(p.element) }}{{ p.element ? ' : ' : '' }}{{ p.message }}</div>
            }
          </section>

          <section class="carte elements">
            <h2>Éléments</h2>
            <div class="tableau-boite"><table class="tableau compact">
              <thead><tr><th>Élément</th><th>Imprimé</th><th>X</th><th>Y</th><th>Largeur</th><th>Hauteur</th><th>Police</th><th>Alignement</th><th>Dans le code</th></tr></thead>
              <tbody>
                @for (p of placements(); track p.element; let i = $index) {
                  <tr [class.choisie]="choisi() === p.element" (focusin)="choisi.set(p.element)">
                    <td>{{ libelleDe(p.element) }}</td>
                    <td><input type="checkbox" [attr.aria-label]="'Imprimer ' + libelleDe(p.element)" [ngModel]="p.imprime" (ngModelChange)="maj(i, { imprime: $event })"></td>
                    @for (k of ['x', 'y', 'l', 'h']; track k) {
                      <td><input type="text" inputmode="decimal" class="mm" [attr.aria-label]="k + ' ' + libelleDe(p.element) + ' (mm)'"
                                 [ngModel]="$any(p)[k]" (ngModelChange)="majNombre(i, k, $event)"></td>
                    }
                    <td>@if (p.element !== 'CODE') { <input type="text" inputmode="decimal" class="mm" [attr.aria-label]="'Police ' + libelleDe(p.element) + ' (pt)'" [ngModel]="p.police" (ngModelChange)="majNombre(i, 'police', $event)"> }</td>
                    <td>@if (p.element !== 'CODE') {
                      <select [attr.aria-label]="'Alignement ' + libelleDe(p.element)" [ngModel]="p.alignement" (ngModelChange)="maj(i, { alignement: $event })">
                        <option value="G">Gauche</option><option value="C">Centre</option><option value="D">Droite</option></select> }</td>
                    <td>@if (possibleDansLeCode(p.element) && deuxD()) {
                      <input type="checkbox" [attr.aria-label]="'Mettre ' + libelleDe(p.element) + ' dans le code'" [ngModel]="p.dansLeCode" (ngModelChange)="maj(i, { dansLeCode: $event })"> }</td>
                  </tr>
                }
              </tbody>
            </table></div>
            <div class="petit doux">Positions et tailles en millimètres, police en points. Un élément décoché n'est pas imprimé ; « dans le code » le met seulement dans le code 2D.</div>
            <div class="rangee">
              <button type="button" class="bouton prim" [disabled]="!valide() || !charge()" (click)="enregistrer()">Enregistrer la disposition</button>
              <button type="button" class="bouton" (click)="retablir()">Rétablir la disposition d'origine</button>
              <label for="p-case" class="petit">Case</label>
              <input id="p-case" type="text" inputmode="numeric" class="case-essai" [(ngModel)]="caseEssai">
              <button type="button" class="bouton" (click)="essai()">Essai sur papier (PDF)</button>
            </div>
            @if (pdfSur()) {
              <iframe class="pdf" [src]="pdfSur()" title="Essai sur papier (PDF)"></iframe>
              <a [href]="pdf()" target="_blank" rel="noopener" class="petit">Ouvrir l'essai dans un onglet</a>
            }
          </section>
        </div>
      }
    </main>
  `,
  styles: `
    .filtres { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
    .filtres .champ { flex: 1 1 240px; }
    .dessin { flex: 1 1 380px; }
    .elements { flex: 999 1 560px; min-width: 0; }
    .fond-dessin { background: #e9edf1; border-radius: 6px; padding: 16px; }
    .svg { display: block; width: 100%; max-width: 520px; margin: 0 auto; outline-offset: 4px; }
    .el { cursor: pointer; }
    .compact td, .compact th { padding: 6px 6px; }
    .compact input.mm { width: 64px; height: 36px; padding: 0 6px; text-align: right; }
    .compact input.mm:focus { padding: 0 5px; }
    .compact select { height: 36px; padding: 0 4px; }
    .case-essai { width: 64px; }
    .pdf { width: 100%; height: 420px; border: 1px solid var(--bord); border-radius: 6px; }
  `,
})
export class Personnalisation implements OnInit {
  private readonly api = inject(Api);
  private readonly session = inject(Session);
  private readonly assainir = inject(DomSanitizer);
  protected readonly codes = Object.entries(CODES);
  protected readonly modeles = Object.entries(MODELES);
  protected readonly code = signal('QR_PLUS');
  protected readonly modele = signal('CARRE_38X21_2');
  protected readonly exempleCip = signal('');
  protected readonly largeur = signal(38);
  protected readonly hauteur = signal(21.2);
  protected readonly placements = signal<Placement[]>([]);
  protected readonly elements = signal<Element[]>([]);
  protected readonly problemes = signal<Probleme[]>([]);
  protected readonly valeurs = signal<Record<string, string>>({});
  protected readonly mise = signal<Record<string, { taille: number; lignes: string[] }>>({});
  protected readonly symbole = signal<{ lignes?: string[]; silence?: number; lineaire?: boolean; erreur?: string }>({});
  protected readonly contenuLisible = signal('');
  protected readonly choisi = signal('');
  protected readonly erreur = signal('');
  protected readonly info = signal('');
  /** vrai quand la disposition affichee est celle du type et de la planche choisis */
  protected readonly charge = signal(false);
  protected readonly pdf = signal<string | null>(null);
  protected readonly pdfSur = signal<SafeResourceUrl | null>(null);
  protected caseEssai = '1';
  /** vrai des que l'utilisateur a choisi un type ou une planche */
  protected choisi_ = false;
  private typeCode = '';
  private planche: Record<string, string> = {};
  private minuterie: ReturnType<typeof setTimeout> | undefined;
  private numero = 0;
  private chargement = 0;

  protected readonly valide = computed(() => !this.problemes().some((p) => p.bloquant));
  protected readonly deuxD = computed(() => this.typeCode !== 'CODE128' && this.code() !== 'CODE128');

  protected dim(v: number) {
    return String(Math.round(v * 10) / 10).replace('.', ',');
  }

  async ngOnInit() {
    try {
      const r = await this.api.reglages();
      if (this.choisi_) {
        /* l'utilisateur a deja choisi : ses choix l'emportent sur les reglages par defaut */
        this.planche = Object.fromEntries(Object.entries(r.planche).filter(([, v]) => v)) as Record<string, string>;
        return;
      }
      this.code.set(r.code);
      this.modele.set(r.modele);
      this.planche = Object.fromEntries(Object.entries(r.planche).filter(([, v]) => v)) as Record<string, string>;
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
    await this.charger();
  }

  /** Chargement pour le type et la planche choisis ; une reponse plus ancienne que le dernier choix est ignoree. */
  protected async charger() {
    this.erreur.set('');
    const n = ++this.chargement;
    this.charge.set(false);
    this.info.set('Chargement…');
    try {
      const d = await this.api.chargerDisposition({ code: this.code(), modele: this.modele(), planche: this.planche });
      if (n !== this.chargement) return;
      this.charge.set(true);
      this.typeCode = d.type;
      this.largeur.set(d.largeur);
      this.hauteur.set(d.hauteur);
      this.elements.set(d.elements);
      this.placements.set(d.disposition.elements);
      this.problemes.set(d.controle.problemes);
      this.info.set(d.source === 'enregistree' ? 'Disposition enregistrée pour ce type et ce format.'
        : d.source === 'echelle' ? 'Reprise à l\'échelle de la disposition ' + d.depuis + ' : vérifiez-la puis enregistrez-la.'
        : d.historique ? 'Dessin d\'origine (non personnalisé).' : 'Disposition proposée : ajustez-la puis enregistrez-la.');
      this.fermerPdf();
      this.controler(true);
    } catch (e) {
      if (n === this.chargement) {
        this.info.set('');
        this.erreur.set(messageErreur(e));
      }
    }
  }

  private disposition() {
    return { version: 1, typeCode: this.typeCode, largeur: this.largeur(), hauteur: this.hauteur(), elements: this.placements() };
  }

  private exemple() {
    const c = this.exempleCip().trim();
    return /^\d{7}$|^\d{13}$/.test(c) ? { cip: c } : {};
  }

  /** Controle de la disposition en cours (apres une courte pause de saisie) ; seule la derniere reponse compte. */
  protected controler(immediat = false) {
    clearTimeout(this.minuterie);
    if (immediat) {
      this.envoyerControle();
    } else {
      this.minuterie = setTimeout(() => this.envoyerControle(), 200);
    }
  }

  private async envoyerControle() {
    const n = ++this.numero;
    try {
      const r = await this.api.controlerDisposition(this.disposition(), this.exemple());
      if (n === this.numero) {
        this.problemes.set(r.controle.problemes);
        this.valeurs.set(r.valeurs);
        this.mise.set(r.mise);
        this.symbole.set(r.symbole);
        this.contenuLisible.set(r.contenuLisible);
      }
    } catch (e) {
      if (n === this.numero) this.erreur.set(messageErreur(e));
    }
  }

  protected libelleDe(id: string): string {
    return this.elements().find((e) => e.id === id)?.libelle || id;
  }

  protected gras(id: string): boolean {
    return !!this.elements().find((e) => e.id === id)?.gras;
  }

  protected possibleDansLeCode(id: string): boolean {
    return !!this.elements().find((e) => e.id === id)?.dansLeCode;
  }

  protected enProbleme(id: string): boolean {
    return this.problemes().some((p) => p.element === id && p.bloquant);
  }

  protected maj(i: number, m: Partial<Placement>) {
    this.placements.set(this.placements().map((p, k) => (k === i ? { ...p, ...m } : p)));
    this.controler();
  }

  protected majNombre(i: number, k: string, v: string) {
    const n = Number(String(v).replace(',', '.'));
    if (String(v).trim() !== '' && Number.isFinite(n)) this.maj(i, { [k]: Math.round(n * 100) / 100 } as Partial<Placement>);
  }

  protected deplacer(e: KeyboardEvent) {
    const i = this.placements().findIndex((p) => p.element === this.choisi());
    const pas = e.shiftKey ? 0.1 : 0.5;
    const d: Record<string, [number, number]> = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] };
    if (i < 0 || !d[e.key]) return;
    e.preventDefault();
    const p = this.placements()[i];
    this.maj(i, { x: Math.round((p.x + d[e.key][0]) * 100) / 100, y: Math.round((p.y + d[e.key][1]) * 100) / 100 });
  }

  /** Texte mis en page par le moteur (memes coupures, meme taille qu'a l'impression). */
  protected lignes(p: Placement) {
    const m = this.mise()[p.element];
    if (!m) return [];
    const taille = m.taille * PT_MM;
    const hl = taille * 1.15;
    const total = hl * m.lignes.length;
    const y0 = p.y + (p.h - total) / 2 + taille * 0.85;
    const x = p.alignement === 'G' ? p.x : p.alignement === 'D' ? p.x + p.l : p.x + p.l / 2;
    const ancre = p.alignement === 'G' ? 'start' : p.alignement === 'D' ? 'end' : 'middle';
    return m.lignes.map((t, k) => ({ texte: t, x, y: y0 + k * hl, taille, ancre }));
  }

  /** Modules du code (barres ou carres) dans son cadre. */
  protected modules(p: Placement): number[][] {
    const s = this.symbole();
    if (!s.lignes || !s.lignes.length) return [];
    const sil = s.silence || 0;
    const larg = s.lignes[0].length + 2 * sil;
    const r: number[][] = [];
    if (s.lineaire) {
      const m = p.l / larg;
      const l = s.lignes[0];
      for (let k = 0; k < l.length; k++) if (l[k] === '1') r.push([p.x + (k + sil) * m, p.y, m, p.h]);
    } else {
      const haut = s.lignes.length + 2 * sil;
      const m = Math.min(p.l / larg, p.h / haut);
      for (let y = 0; y < s.lignes.length; y++) {
        for (let x = 0; x < s.lignes[y].length; x++) {
          if (s.lignes[y][x] === '1') r.push([p.x + (x + sil) * m, p.y + (y + sil) * m, m + 0.01, m + 0.01]);
        }
      }
    }
    return r;
  }

  protected async enregistrer() {
    try {
      const r = await this.api.enregistrerDisposition(this.disposition());
      this.session.annoncer(r.message);
      this.info.set('Disposition enregistrée pour ce type et ce format.');
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  protected async retablir() {
    try {
      const r = await this.api.supprimerDisposition(this.typeCode, this.largeur(), this.hauteur());
      this.session.annoncer(r.message, r.supprimee ? 'ok' : 'info');
      await this.charger();
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  protected async essai() {
    try {
      const b = await this.api.essaiDisposition({ disposition: this.disposition(), modele: this.modele(),
        planche: this.planche, position: Number(this.caseEssai) || 1, exemple: this.exemple() });
      this.fermerPdf();
      const u = urlPdf(b);
      this.pdf.set(u);
      this.pdfSur.set(this.assainir.bypassSecurityTrustResourceUrl(u));
    } catch (e) {
      this.erreur.set(await messageErreurPdf(e));
    }
  }

  private fermerPdf() {
    const u = this.pdf();
    if (u) URL.revokeObjectURL(u);
    this.pdf.set(null);
    this.pdfSur.set(null);
  }
}
