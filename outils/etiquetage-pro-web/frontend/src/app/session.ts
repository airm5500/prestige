import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Api, Utilisateur } from './api';

/** Utilisateur connecte et bandeau de messages de l'application (aucune fenetre surgissante). */
@Injectable({ providedIn: 'root' })
export class Session {
  private readonly api = inject(Api);
  readonly utilisateur = signal<Utilisateur | null>(null);
  readonly message = signal<{ texte: string; genre: 'ok' | 'erreur' | 'info' } | null>(null);
  private minuterie: ReturnType<typeof setTimeout> | undefined;

  async charger(): Promise<Utilisateur | null> {
    try {
      this.utilisateur.set(await this.api.moi());
    } catch {
      this.utilisateur.set(null);
    }
    return this.utilisateur();
  }

  annoncer(texte: string, genre: 'ok' | 'erreur' | 'info' = 'ok') {
    this.message.set({ texte, genre });
    clearTimeout(this.minuterie);
    if (genre !== 'erreur') {
      this.minuterie = setTimeout(() => this.message.set(null), 6000);
    }
  }
}

export const connecte: CanActivateFn = async (_route, etat) => {
  const session = inject(Session);
  const router = inject(Router);
  if (session.utilisateur() || (await session.charger())) {
    return true;
  }
  return router.createUrlTree(['/connexion'], { queryParams: { retour: etat.url } });
};

/** Session expiree : retour a l'ecran de connexion (sauf pour la connexion elle-meme). */
export const sessionExpiree: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const session = inject(Session);
  return next(req).pipe(
    catchError((e) => {
      if (e instanceof HttpErrorResponse && e.status === 401 && !req.url.endsWith('/api/connexion')
          && !req.url.endsWith('/api/moi')) {
        session.utilisateur.set(null);
        session.annoncer('Session expirée : reconnectez-vous.', 'info');
        router.navigate(['/connexion'], { queryParams: { retour: router.url } });
      }
      return throwError(() => e);
    }),
  );
};
