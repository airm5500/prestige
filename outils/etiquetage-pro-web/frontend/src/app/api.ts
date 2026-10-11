import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type TypeChamp = 'CODE' | 'TEXTE' | 'PRIX' | 'ENTIER' | 'DATE';

export interface Champ {
  nom: string;
  libelle: string;
  type: TypeChamp;
  longueur: number | null;
  obligatoire: boolean;
  systeme: boolean;
  affiche: boolean;
  ordre: number;
}

export interface Produit {
  cip: string;
  valeurs: Record<string, string>;
  creeLe: string | null;
  creePar: string | null;
  modifieLe: string | null;
  modifiePar: string | null;
}

export interface PageProduits {
  total: number;
  page: number;
  taille: number;
  produits: Produit[];
}

export interface Filtre {
  q?: string;
  peremption?: string;
  dernierImport?: boolean;
  tri?: string;
  sens?: 'asc' | 'desc';
}

export interface Controle {
  valeurs: Record<string, string>;
  erreurs: Record<string, string>;
}

export interface Ecart {
  champ: string;
  libelle: string;
  avant: string | null;
  apres: string | null;
}

export interface Evenement {
  quand: string;
  qui: string | null;
  source: string;
  ecarts: Ecart[];
}

export interface Colonne {
  index: number;
  action: 'champ' | 'nouveau' | 'ignorer';
  champ?: string | null;
  libelle?: string | null;
  type?: TypeChamp | null;
}

export interface Analyse {
  id: string;
  fichier: string;
  lignes: number;
  lignesIgnorees: number;
  feuilles: string[];
  feuille: string | null;
  separateur: string | null;
  encodage: string | null;
  avecTitres: boolean;
  modeleReconnu: boolean;
  colonnes: { index: number; titre: string; exemples: string[]; proposition: Colonne }[];
}

export interface ErreurLigne {
  ligne: number;
  cip: string | null;
  colonne: string;
  valeur: string | null;
  message: string;
}

export interface ControleImport {
  lignes: number;
  nouveaux: number;
  misAJour: number;
  inchanges: number;
  lignesEnErreur: number;
  doublons: number;
  erreurs: ErreurLigne[];
  totalErreurs: number;
  detailDoublons: { cip: string; lignes: number[]; gardee: number }[];
  champsAjoutes: string[];
}

export interface ResultatImport {
  journal: number;
  lignes: number;
  crees: number;
  misAJour: number;
  inchanges: number;
  lignesEnErreur: number;
  doublons: number;
  champsAjoutes: string[];
}

export interface Journal {
  id: number;
  quand: string;
  qui: string;
  fichier: string;
  lignes: number;
  crees: number;
  misAJour: number;
  inchanges: number;
  lignesEnErreur: number;
  doublons: number;
  champsAjoutes: string | null;
}

export type Planche = Record<string, string | null>;

export interface Reglages {
  officine: string;
  monnaie: string;
  code: string;
  modele: string;
  planche: Planche;
  modeles: string[];
  codes: string[];
}

export interface DemandeImpression {
  cips: string[];
  nombres?: Record<string, number>;
  code?: string;
  modele?: string;
  position?: number;
  date?: string;
  planche?: Planche;
}

export interface Resume {
  produits: number;
  etiquettes: number;
  parPage: number;
  pages: number;
  position: number;
  largeur: number;
  hauteur: number;
  introuvables: string[];
  alertes: { cip: string; designation: string; erreurs: string[]; avertissements: string[] }[];
}

export interface Utilisateur {
  login: string;
  motDePasseParDefaut: boolean;
}

/** Message d'erreur de l'API ({message, erreurs}), sinon un message general. */
export function messageErreur(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    const m = e.error && typeof e.error === 'object' ? e.error.message : null;
    if (m) {
      return m;
    }
    if (e.status === 0) {
      return "Étiquettage Pro ne répond pas : l'application est-elle lancée ?";
    }
    return 'Erreur ' + e.status + ' : action impossible.';
  }
  return 'Action impossible.';
}

export function erreursChamps(e: unknown): Record<string, string> {
  return e instanceof HttpErrorResponse && e.error && e.error.erreurs ? e.error.erreurs : {};
}

function params(f: Filtre, extra: Record<string, string | number> = {}): HttpParams {
  let p = new HttpParams();
  if (f.q) p = p.set('q', f.q);
  if (f.peremption) p = p.set('peremption', f.peremption);
  if (f.dernierImport) p = p.set('dernierImport', 'true');
  if (f.tri) p = p.set('tri', f.tri);
  if (f.sens) p = p.set('sens', f.sens);
  for (const [k, v] of Object.entries(extra)) p = p.set(k, String(v));
  return p;
}

/** Acces a l'API d'Etiquettage Pro (meme origine, session et jeton CSRF geres par Angular). */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  private get<T>(url: string, p?: HttpParams): Promise<T> {
    return firstValueFrom(this.http.get<T>(url, { params: p }));
  }

  private post<T>(url: string, corps: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(url, corps));
  }

  private pdf(url: string, corps: unknown): Promise<Blob> {
    return firstValueFrom(this.http.post(url, corps, { responseType: 'blob' }));
  }

  etat() { return this.get<{ premierLancement: boolean; version: string }>('/api/etat'); }
  moi() { return this.get<Utilisateur>('/api/moi'); }
  connexion(login: string, motDePasse: string) { return this.post<Utilisateur>('/api/connexion', { login, motDePasse }); }
  deconnexion() { return this.post<unknown>('/api/deconnexion', {}); }
  motDePasse(actuel: string, nouveau: string) { return this.post<unknown>('/api/mot-de-passe', { actuel, nouveau }); }

  champs() { return this.get<Champ[]>('/api/champs'); }
  produits(f: Filtre, page: number, taille: number) {
    return this.get<PageProduits>('/api/produits', params(f, { page, taille }));
  }
  cips(f: Filtre) { return this.get<string[]>('/api/produits/cips', params(f)); }
  produit(cip: string) { return this.get<Produit>('/api/produits/' + encodeURIComponent(cip)); }
  historique(cip: string) { return this.get<Evenement[]>('/api/produits/' + encodeURIComponent(cip) + '/historique'); }
  controler(saisie: Record<string, string>, cip?: string) {
    const p = cip ? new HttpParams().set('cip', cip) : undefined;
    return firstValueFrom(this.http.post<Controle>('/api/produits/controle', saisie, { params: p }));
  }
  creer(saisie: Record<string, string>) { return this.post<Produit>('/api/produits', saisie); }
  modifier(cip: string, saisie: Record<string, string>) {
    return firstValueFrom(this.http.put<Produit>('/api/produits/' + encodeURIComponent(cip), saisie));
  }
  supprimer(cips: string[]) { return this.post<{ supprimes: number }>('/api/produits/suppression', { cips }); }

  analyser(fichier: File, avecTitres: boolean) {
    const f = new FormData();
    f.append('fichier', fichier, fichier.name);
    return firstValueFrom(this.http.post<Analyse>('/api/imports', f, {
      params: new HttpParams().set('avecTitres', String(avecTitres)),
    }));
  }
  relire(id: string, feuille: string | null, avecTitres: boolean) {
    return this.post<Analyse>('/api/imports/' + id + '/relire', { feuille, avecTitres });
  }
  controlerImport(id: string, colonnes: Colonne[]) {
    return this.post<ControleImport>('/api/imports/' + id + '/controle', { colonnes });
  }
  appliquerImport(id: string, colonnes: Colonne[]) {
    return this.post<ResultatImport>('/api/imports/' + id + '/appliquer', { colonnes });
  }
  journal() { return this.get<Journal[]>('/api/imports/journal'); }

  reglages() { return this.get<Reglages>('/api/impression/reglages'); }
  enregistrerReglages(r: Partial<Reglages>) {
    return firstValueFrom(this.http.put<Reglages>('/api/impression/reglages', r));
  }
  resume(d: DemandeImpression) { return this.post<Resume>('/api/impression/resume', d); }
  imprimer(d: DemandeImpression) { return this.pdf('/api/impression/pdf', d); }
  pageDeTest(modele: string, planche: Planche) { return this.pdf('/api/impression/test', { modele, planche }); }

  chargerDisposition(c: { code: string; modele: string; planche?: Planche }) {
    return this.post<any>('/api/personnalisation/charger', c);
  }
  controlerDisposition(disposition: unknown, exemple: unknown) {
    return this.post<any>('/api/personnalisation/controler', { disposition, exemple });
  }
  enregistrerDisposition(disposition: unknown) {
    return this.post<{ message: string }>('/api/personnalisation/enregistrer', { disposition });
  }
  supprimerDisposition(type: string, largeur: number, hauteur: number) {
    return this.post<{ message: string; supprimee: boolean }>('/api/personnalisation/supprimer', { type, largeur, hauteur });
  }
  essaiDisposition(c: unknown) { return this.pdf('/api/personnalisation/essai', c); }
}

/** Message d'une erreur rendue en Blob (reponse PDF refusee). */
export async function messageErreurPdf(e: unknown): Promise<string> {
  if (e instanceof HttpErrorResponse && e.error instanceof Blob) {
    try {
      const j = JSON.parse(await e.error.text());
      if (j && j.message) return j.message;
    } catch {
      /* corps illisible */
    }
  }
  return messageErreur(e);
}
