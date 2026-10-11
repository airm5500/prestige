import { Routes } from '@angular/router';
import { connecte } from './session';

export const routes: Routes = [
  { path: 'connexion', title: 'Connexion — Étiquettage Pro', loadComponent: () => import('./connexion').then((m) => m.Connexion) },
  {
    path: '',
    canActivate: [connecte],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'catalogue' },
      { path: 'catalogue', title: 'Catalogue — Étiquettage Pro', loadComponent: () => import('./catalogue').then((m) => m.Catalogue) },
      { path: 'produit/nouveau', title: 'Nouveau produit — Étiquettage Pro', loadComponent: () => import('./fiche').then((m) => m.Fiche) },
      { path: 'produit/:cip', title: 'Fiche produit — Étiquettage Pro', loadComponent: () => import('./fiche').then((m) => m.Fiche) },
      { path: 'import', title: 'Importer — Étiquettage Pro', loadComponent: () => import('./import').then((m) => m.Import) },
      { path: 'impression', title: 'Imprimer — Étiquettage Pro', loadComponent: () => import('./impression').then((m) => m.Impression) },
      { path: 'personnalisation', title: 'Personnaliser — Étiquettage Pro', loadComponent: () => import('./personnalisation').then((m) => m.Personnalisation) },
      { path: 'compte', title: 'Mon compte — Étiquettage Pro', loadComponent: () => import('./compte').then((m) => m.Compte) },
    ],
  },
  { path: '**', redirectTo: 'catalogue' },
];
