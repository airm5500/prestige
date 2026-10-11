import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Analyse, Api, Champ, Colonne, ControleImport, Journal, ResultatImport, TypeChamp, messageErreur } from './api';
import { Selection } from './selection';

const TYPES: { v: TypeChamp; l: string }[] = [
  { v: 'TEXTE', l: 'Texte' }, { v: 'ENTIER', l: 'Nombre entier' }, { v: 'PRIX', l: 'Prix' }, { v: 'DATE', l: 'Date' },
];
const ROLES: Record<string, string> = {
  cip: 'CIP — clé de mise à jour', designation: 'Désignation', prix: 'Prix', lot: 'Lot', peremption: 'Péremption',
  ean: 'EAN (code 2D)', grossiste: 'Grossiste', code_geo: 'Code géo', mention: 'Mention libre', nombre: "Nombre d'étiquettes",
};

@Component({
  selector: 'ep-import',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <div class="entre">
        <h1>Importer un fichier</h1>
        @if (analyse(); as a) {
          <span class="petit doux">{{ a.fichier }} · {{ a.lignes.toLocaleString('fr-FR') }} ligne{{ a.lignes > 1 ? 's' : '' }}
            @if (a.feuille) { · feuille « {{ a.feuille }} » } @if (a.separateur) { · séparateur « {{ a.separateur }} » }</span>
        }
      </div>
      <ol class="etapes" aria-label="Étapes de l'import">
        <li [class.courante]="etape() === 1" [attr.aria-current]="etape() === 1 ? 'step' : null">1. Fichier{{ etape() > 1 ? ' ✓' : '' }}</li>
        <li [class.courante]="etape() === 2" [attr.aria-current]="etape() === 2 ? 'step' : null">2. Champs{{ etape() > 2 ? ' ✓' : '' }}</li>
        <li [class.courante]="etape() === 3" [attr.aria-current]="etape() === 3 ? 'step' : null">3. Contrôle{{ etape() > 3 ? ' ✓' : '' }}</li>
        <li [class.courante]="etape() === 4" [attr.aria-current]="etape() === 4 ? 'step' : null">4. Résultat</li>
      </ol>
      @if (erreur()) { <div class="bandeau erreur" role="alert">{{ erreur() }}</div> }

      @switch (etape()) {
        @case (1) {
          <section class="carte">
            <label class="depot" [class.survol]="survol()" (dragover)="$event.preventDefault(); survol.set(true)"
                   (dragleave)="survol.set(false)" (drop)="deposer($event)">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0B5E78" stroke-width="2" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"></path></svg>
              <b>Déposez le fichier ici, ou cliquez pour le choisir</b>
              <span class="petit doux">CSV (séparateur ; , tabulation ou |) ou Excel (.xlsx, .xls) · 30 Mo au plus</span>
              <input type="file" class="visuellement-cache" accept=".csv,.txt,.xlsx,.xls" (change)="choisir($event)" aria-label="Choisir le fichier à importer">
            </label>
            <label class="rangee"><input type="checkbox" [(ngModel)]="avecTitres"> La première ligne porte les titres des colonnes</label>
            @if (enCours()) { <div class="bandeau info" role="status">Lecture du fichier…</div> }
          </section>
          @if (journal().length) {
            <section class="carte">
              <h2>Derniers imports</h2>
              <div class="tableau-boite"><table class="tableau">
                <thead><tr><th>Date</th><th>Fichier</th><th>Par</th><th class="droite">Lignes</th><th class="droite">Créés</th><th class="droite">Mis à jour</th><th class="droite">Inchangés</th><th class="droite">En erreur</th><th>Champs ajoutés</th></tr></thead>
                <tbody>
                  @for (j of journal(); track j.id) {
                    <tr><td>{{ j.quand }}</td><td>{{ j.fichier }}</td><td>{{ j.qui }}</td><td class="droite">{{ j.lignes }}</td><td class="droite">{{ j.crees }}</td>
                      <td class="droite">{{ j.misAJour }}</td><td class="droite">{{ j.inchanges }}</td><td class="droite">{{ j.lignesEnErreur }}</td><td>{{ j.champsAjoutes || '—' }}</td></tr>
                  }
                </tbody>
              </table></div>
            </section>
          }
        }
        @case (2) {
          @if (analyse(); as a) {
            <section class="carte">
              <div class="entre">
                <h2>Chaque colonne du fichier devient un champ du catalogue</h2>
                <span class="petit doux">Proposé automatiquement, modifiable</span>
              </div>
              <div class="rangee">
                @if (a.feuilles.length > 1) {
                  <label for="feuille" class="petit">Feuille</label>
                  <select id="feuille" [ngModel]="a.feuille" (ngModelChange)="relire($event, a.avecTitres)">
                    @for (f of a.feuilles; track f) { <option [value]="f">{{ f }}</option> }
                  </select>
                }
                <label class="rangee petit"><input type="checkbox" [ngModel]="a.avecTitres" (ngModelChange)="relire(a.feuille, $event)"> Première ligne = titres</label>
              </div>
              @if (a.modeleReconnu) {
                <div class="bandeau ok">Format reconnu : la correspondance du dernier fichier de ce format est reprise.</div>
              }
              <div class="tableau-boite"><table class="tableau correspondance">
                <thead><tr><th>Colonne du fichier</th><th>Exemple</th><th>Champ du catalogue</th><th>Type</th><th>Rôle sur l'étiquette</th></tr></thead>
                <tbody>
                  @for (c of a.colonnes; track c.index; let i = $index) {
                    <tr [class.choisie]="colonnes()[i].champ === 'cip'" [class.ignoree]="colonnes()[i].action === 'ignorer'">
                      <td><b>{{ c.titre }}</b></td>
                      <td class="exemple">{{ c.exemples.join(' · ') || '—' }}</td>
                      <td>
                        <label class="visuellement-cache" [for]="'c-' + i">Champ pour la colonne {{ c.titre }}</label>
                        <select [id]="'c-' + i" [ngModel]="choixDe(i)" (ngModelChange)="choisirChamp(i, $event)">
                          <option value="#ignorer">Ignorer cette colonne</option>
                          <option value="#nouveau">Nouveau champ…</option>
                          @for (ch of champs(); track ch.nom) { <option [value]="ch.nom">{{ ch.libelle }}</option> }
                        </select>
                        @if (colonnes()[i].action === 'nouveau') {
                          <label class="visuellement-cache" [for]="'l-' + i">Nom du nouveau champ</label>
                          <input type="text" [id]="'l-' + i" class="nouveau" [ngModel]="colonnes()[i].libelle" (ngModelChange)="maj(i, { libelle: $event })" maxlength="60">
                        }
                      </td>
                      <td>
                        @if (colonnes()[i].action === 'nouveau') {
                          <label class="visuellement-cache" [for]="'t-' + i">Type du nouveau champ</label>
                          <select [id]="'t-' + i" [ngModel]="colonnes()[i].type" (ngModelChange)="maj(i, { type: $event })">
                            @for (t of types; track t.v) { <option [value]="t.v">{{ t.l }}</option> }
                          </select>
                        } @else { {{ typeDe(i) }} }
                      </td>
                      <td>{{ role(i) }}</td>
                    </tr>
                  }
                </tbody>
              </table></div>
              @if (nouveaux().length) {
                <div class="bandeau info">Champ{{ nouveaux().length > 1 ? 's' : '' }} ajouté{{ nouveaux().length > 1 ? 's' : '' }} au catalogue : {{ nouveaux().join(', ') }}. Les champs déjà présents gardent leur type. La correspondance est mémorisée pour le prochain fichier du même format.</div>
              }
              @if (!cipAssocie()) { <div class="bandeau alerte" role="alert">Associez une colonne au CIP : c'est lui qui identifie le produit.</div> }
            </section>
            <div class="entre">
              <button type="button" class="bouton" (click)="recommencer()">Précédent</button>
              <button type="button" class="bouton prim" [disabled]="!cipAssocie() || enCours()" (click)="controler()">
                {{ enCours() ? 'Contrôle…' : 'Contrôler les ' + a.lignes.toLocaleString('fr-FR') + ' lignes' }}</button>
            </div>
          }
        }
        @case (3) {
          @if (controle(); as c) {
            <section class="carte">
              <h2>Contrôle avant écriture</h2>
              <div class="compteurs">
                <div class="compteur"><b>{{ c.misAJour.toLocaleString('fr-FR') }}</b><span>CIP déjà connus : mis à jour</span></div>
                <div class="compteur"><b>{{ c.nouveaux.toLocaleString('fr-FR') }}</b><span>nouveaux produits</span></div>
                <div class="compteur"><b>{{ c.inchanges.toLocaleString('fr-FR') }}</b><span>déjà à jour (inchangés)</span></div>
                <div class="compteur" [class.alerte]="c.lignesEnErreur > 0"><b>{{ c.lignesEnErreur.toLocaleString('fr-FR') }}</b><span>lignes en erreur (non importées)</span></div>
                <div class="compteur"><b>{{ c.doublons.toLocaleString('fr-FR') }}</b><span>CIP en double dans le fichier (dernière ligne gardée)</span></div>
              </div>
              <div class="petit doux">Une cellule vide n'efface jamais une valeur du catalogue. Rien n'est écrit tant que vous n'avez pas validé.</div>
              @if (c.totalErreurs) {
                <div class="entre">
                  <h2>Erreurs ({{ c.totalErreurs.toLocaleString('fr-FR') }})</h2>
                  <a class="bouton" [href]="'/api/imports/' + analyse()!.id + '/erreurs.csv'" download="erreurs-import.csv">Exporter les erreurs (CSV)</a>
                </div>
                <div class="tableau-boite"><table class="tableau">
                  <thead><tr><th>Ligne</th><th>CIP</th><th>Colonne</th><th>Valeur</th><th>Erreur</th></tr></thead>
                  <tbody>
                    @for (e of c.erreurs; track $index) {
                      <tr><td>{{ e.ligne }}</td><td class="mono">{{ e.cip }}</td><td>{{ e.colonne }}</td><td>{{ e.valeur }}</td><td>{{ e.message }}</td></tr>
                    }
                  </tbody>
                </table></div>
                @if (c.totalErreurs > c.erreurs.length) { <div class="petit doux">{{ c.erreurs.length }} premières erreurs affichées : toutes sont dans le CSV.</div> }
              }
              @if (c.detailDoublons.length) {
                <details><summary>CIP en double ({{ c.doublons }})</summary>
                  <ul class="petit">@for (d of c.detailDoublons; track d.cip) { <li><span class="mono">{{ d.cip }}</span> : lignes {{ d.lignes.join(', ') }} — ligne {{ d.gardee }} gardée</li> }</ul>
                </details>
              }
            </section>
            <div class="entre">
              <button type="button" class="bouton" (click)="etape.set(2)">Précédent</button>
              <button type="button" class="bouton prim" [disabled]="enCours() || c.nouveaux + c.misAJour + c.inchanges === 0" (click)="appliquer()">
                {{ enCours() ? 'Import…' : 'Importer ' + (c.nouveaux + c.misAJour).toLocaleString('fr-FR') + ' produit' + (c.nouveaux + c.misAJour > 1 ? 's' : '') }}</button>
            </div>
          }
        }
        @case (4) {
          @if (resultat(); as r) {
            <section class="carte">
              <div class="bandeau ok" role="status">Import terminé.</div>
              <div class="compteurs">
                <div class="compteur"><b>{{ r.crees.toLocaleString('fr-FR') }}</b><span>produits créés</span></div>
                <div class="compteur"><b>{{ r.misAJour.toLocaleString('fr-FR') }}</b><span>produits mis à jour</span></div>
                <div class="compteur"><b>{{ r.inchanges.toLocaleString('fr-FR') }}</b><span>inchangés</span></div>
                <div class="compteur" [class.alerte]="r.lignesEnErreur > 0"><b>{{ r.lignesEnErreur.toLocaleString('fr-FR') }}</b><span>lignes en erreur (non importées)</span></div>
              </div>
              @if (r.champsAjoutes.length) { <div class="petit">Champs ajoutés au catalogue : {{ r.champsAjoutes.join(', ') }}.</div> }
              <div class="rangee">
                <a class="bouton" routerLink="/catalogue" [queryParams]="{ dernierImport: 1 }">Voir les produits de cet import</a>
                <button type="button" class="bouton prim" (click)="imprimerImport()">Imprimer les étiquettes de cet import</button>
                @if (controle()?.totalErreurs) {
                  <a class="bouton" [href]="'/api/imports/' + analyse()!.id + '/erreurs.csv'" download="erreurs-import.csv">Exporter les erreurs (CSV)</a>
                }
                <button type="button" class="bouton" (click)="recommencer()">Nouvel import</button>
              </div>
            </section>
          }
        }
      }
    </main>
  `,
  styles: `
    .correspondance select { width: 100%; min-width: 200px; }
    .correspondance .nouveau { margin-top: 6px; width: 100%; }
    .correspondance tr.ignoree td { color: var(--doux); }
    .exemple { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    details summary { cursor: pointer; color: var(--prim); }
  `,
})
export class Import implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly selection = inject(Selection);
  protected readonly types = TYPES;
  protected readonly etape = signal(1);
  protected readonly analyse = signal<Analyse | null>(null);
  protected readonly colonnes = signal<Colonne[]>([]);
  protected readonly controle = signal<ControleImport | null>(null);
  protected readonly resultat = signal<ResultatImport | null>(null);
  protected readonly champs = signal<Champ[]>([]);
  protected readonly journal = signal<Journal[]>([]);
  protected readonly erreur = signal('');
  protected readonly enCours = signal(false);
  protected readonly survol = signal(false);
  protected avecTitres = true;

  protected readonly cipAssocie = computed(() => this.colonnes().some((c) => c.action === 'champ' && c.champ === 'cip'));
  protected readonly nouveaux = computed(() =>
    this.colonnes().filter((c) => c.action === 'nouveau').map((c) => c.libelle || '(sans nom)'));

  async ngOnInit() {
    try {
      const [c, j] = await Promise.all([this.api.champs(), this.api.journal()]);
      this.champs.set(c);
      this.journal.set(j);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  protected choisir(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    (e.target as HTMLInputElement).value = '';
    if (f) this.lire(f);
  }

  protected deposer(e: DragEvent) {
    e.preventDefault();
    this.survol.set(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) this.lire(f);
  }

  private async lire(f: File) {
    if (f.size > 30 * 1024 * 1024) {
      this.erreur.set('Fichier trop volumineux (30 Mo au plus).');
      return;
    }
    this.enCours.set(true);
    this.erreur.set('');
    try {
      this.prendre(await this.api.analyser(f, this.avecTitres));
      this.etape.set(2);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.enCours.set(false);
    }
  }

  private prendre(a: Analyse) {
    this.analyse.set(a);
    this.colonnes.set(a.colonnes.map((c) => ({ ...c.proposition })));
    this.controle.set(null);
  }

  protected async relire(feuille: string | null, avecTitres: boolean) {
    try {
      this.prendre(await this.api.relire(this.analyse()!.id, feuille, avecTitres));
      this.erreur.set('');
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  protected choixDe(i: number): string {
    const c = this.colonnes()[i];
    return c.action === 'champ' ? c.champ! : '#' + c.action;
  }

  protected choisirChamp(i: number, v: string) {
    const titre = this.analyse()!.colonnes[i].titre;
    if (v === '#ignorer') this.maj(i, { action: 'ignorer', champ: null });
    else if (v === '#nouveau') {
      this.maj(i, { action: 'nouveau', champ: null, libelle: this.colonnes()[i].libelle || titre.slice(0, 60), type: this.colonnes()[i].type || 'TEXTE' });
    } else {
      /* un champ ne sert qu'a une colonne : l'autre colonne qui l'avait est ignoree */
      this.colonnes.set(this.colonnes().map((c, k) =>
        k !== i && c.action === 'champ' && c.champ === v ? { ...c, action: 'ignorer', champ: null } : c));
      this.maj(i, { action: 'champ', champ: v });
    }
  }

  protected maj(i: number, m: Partial<Colonne>) {
    this.colonnes.set(this.colonnes().map((c, k) => (k === i ? { ...c, ...m } : c)));
  }

  protected typeDe(i: number): string {
    const c = this.colonnes()[i];
    if (c.action !== 'champ') return '—';
    const ch = this.champs().find((x) => x.nom === c.champ);
    if (!ch) return '';
    switch (ch.type) {
      case 'CODE': return ch.nom === 'cip' ? 'Code (7 ou 13 chiffres)' : 'Code (chiffres)';
      case 'PRIX': return 'Prix (entier ≥ 0)';
      case 'ENTIER': return 'Nombre entier';
      case 'DATE': return 'Date (jj/mm/aaaa)';
      default: return 'Texte (' + (ch.longueur || 100) + ' car.)';
    }
  }

  protected role(i: number): string {
    const c = this.colonnes()[i];
    if (c.action === 'ignorer') return 'Colonne ignorée (non importée)';
    if (c.action === 'nouveau') return 'Champ libre (gardé en base)';
    return ROLES[c.champ!] || 'Champ libre (gardé en base)';
  }

  protected async controler() {
    this.enCours.set(true);
    this.erreur.set('');
    try {
      this.controle.set(await this.api.controlerImport(this.analyse()!.id, this.colonnes()));
      this.etape.set(3);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.enCours.set(false);
    }
  }

  protected async appliquer() {
    this.enCours.set(true);
    this.erreur.set('');
    try {
      this.resultat.set(await this.api.appliquerImport(this.analyse()!.id, this.colonnes()));
      this.etape.set(4);
      this.champs.set(await this.api.champs());
      this.journal.set(await this.api.journal());
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.enCours.set(false);
    }
  }

  protected async imprimerImport() {
    try {
      this.selection.remplacer(await this.api.cips({ dernierImport: true }));
      this.router.navigate(['/impression']);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  protected recommencer() {
    this.analyse.set(null);
    this.controle.set(null);
    this.resultat.set(null);
    this.erreur.set('');
    this.etape.set(1);
  }
}
