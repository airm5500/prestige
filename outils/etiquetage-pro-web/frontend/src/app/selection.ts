import { Injectable, computed, signal } from '@angular/core';

const CLE = 'etiquettage.selection';

/** Produits coches pour l'impression (gardes le temps de la session du navigateur). */
@Injectable({ providedIn: 'root' })
export class Selection {
  readonly cips = signal<string[]>(Selection.lire());
  readonly nombre = computed(() => this.cips().length);
  private readonly ensemble = computed(() => new Set(this.cips()));

  private static lire(): string[] {
    try {
      const v = JSON.parse(sessionStorage.getItem(CLE) || '[]');
      return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }

  private ecrire(l: string[]) {
    this.cips.set(l);
    try {
      sessionStorage.setItem(CLE, JSON.stringify(l));
    } catch {
      /* stockage indisponible : la selection reste en memoire */
    }
  }

  contient(cip: string): boolean {
    return this.ensemble().has(cip);
  }

  basculer(cip: string) {
    this.contient(cip) ? this.retirer([cip]) : this.ajouter([cip]);
  }

  ajouter(cips: string[]) {
    const s = new Set(this.cips());
    const l = [...this.cips()];
    for (const c of cips) {
      if (!s.has(c)) {
        s.add(c);
        l.push(c);
      }
    }
    this.ecrire(l);
  }

  retirer(cips: string[]) {
    const r = new Set(cips);
    this.ecrire(this.cips().filter((c) => !r.has(c)));
  }

  remplacer(cips: string[]) {
    this.ecrire([...new Set(cips)]);
  }

  vider() {
    this.ecrire([]);
  }
}
