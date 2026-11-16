package rest.service.impl.pointage;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Pointage des bons par organisme (15/11) : regles de controle automatique d'un bon, sans acces a la base, pour etre
 * verifiees seules (RegleControleBonCoherenceTest).
 *
 * Six blocs, numerotes comme a l'ecran (touches 1 a 6) : assure, ayant droit, taux, produits et prix, montant, date.
 * Chaque bloc rend un niveau : OK (vert, verifie par le logiciel), INFO (a comparer au papier), ALERTE (anomalie
 * probable, signalee avant meme le pointage).
 *
 * Montant : le moteur de la vente (plafonds, prix de reference par organisme, prise en charge totale) n'est pas rejoue
 * ici. Le montant attendu est la regle simple base x taux, arrondie au franc ; un ecart avec la part enregistree se
 * compare au papier (INFO) ; seuls les montants impossibles sont des alertes (part negative, nulle avec un taux, plus
 * grande que la vente, ou parts des organismes plus grandes que la vente).
 */
public final class RegleControleBon {

    public enum Niveau {
        OK, INFO, ALERTE
    }

    public static final int ASSURE = 1, AYANT_DROIT = 2, TAUX = 3, PRODUITS = 4, MONTANT = 5, DATE = 6;

    /** Resultat d'un bloc : niveau et phrase affichee. */
    public static final class Controle {
        public final int bloc;
        public final Niveau niveau;
        public final String texte;

        public Controle(int bloc, Niveau niveau, String texte) {
            this.bloc = bloc;
            this.niveau = niveau;
            this.texte = texte;
        }
    }

    private RegleControleBon() {
    }

    /** Delai maximal de saisie : celui de l'organisme, sinon celui de son groupe, sinon aucun (null). */
    public static Integer delaiApplicable(Integer delaiOrganisme, Integer delaiGroupe) {
        if (delaiOrganisme != null && delaiOrganisme >= 0) {
            return delaiOrganisme;
        }
        if (delaiGroupe != null && delaiGroupe >= 0) {
            return delaiGroupe;
        }
        return null;
    }

    /** Date : ecart entre la date de l'ordonnance et la saisie de la vente, compare au delai de l'organisme. */
    public static Controle date(LocalDate ordonnance, LocalDate saisie, Integer delai, String origineDelai) {
        if (saisie == null) {
            return new Controle(DATE, Niveau.INFO, "Date de saisie inconnue");
        }
        if (ordonnance == null) {
            return new Controle(DATE, Niveau.INFO, "Date de l'ordonnance non saisie : délai non contrôlé");
        }
        long jours = ChronoUnit.DAYS.between(ordonnance, saisie);
        if (jours < 0) {
            return new Controle(DATE, Niveau.ALERTE, "Ordonnance datée après la vente (" + (-jours) + " j)");
        }
        if (delai == null) {
            return new Controle(DATE, Niveau.OK, "Délai " + jours + " j (aucun maximum pour cet organisme)");
        }
        if (jours > delai) {
            return new Controle(DATE, Niveau.ALERTE,
                    "Délai " + jours + " j : maximum " + delai + " j" + suffixe(origineDelai));
        }
        return new Controle(DATE, Niveau.OK,
                "Délai " + jours + " j (maximum " + delai + " j" + suffixe(origineDelai) + ")");
    }

    private static String suffixe(String origine) {
        return origine == null || origine.isEmpty() ? "" : ", " + origine;
    }

    /** Taux : le taux du bon est-il celui du contrat client - organisme ? */
    public static Controle taux(Integer tauxBon, Integer tauxContrat) {
        if (tauxBon == null) {
            return new Controle(TAUX, Niveau.ALERTE, "Taux absent du bon");
        }
        if (tauxContrat == null) {
            return new Controle(TAUX, Niveau.INFO, tauxBon + " % (pas de contrat lisible)");
        }
        if (!tauxBon.equals(tauxContrat)) {
            return new Controle(TAUX, Niveau.ALERTE, tauxBon + " % ≠ contrat (" + tauxContrat + " %)");
        }
        return new Controle(TAUX, Niveau.OK, tauxBon + " % = contrat du client pour cet organisme");
    }

    /** Montant attendu par la regle simple : base x taux / 100, arrondi au franc (demi superieur). */
    public static long attendu(long base, int taux) {
        return BigDecimal.valueOf(base).multiply(BigDecimal.valueOf(taux))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).longValue();
    }

    /**
     * Montant : part enregistree de l'organisme comparee a la regle et a la vente.
     *
     * @param base
     *            base de calcul (somme des lignes prises en charge)
     * @param montantVente
     *            montant de la vente
     * @param sommeParts
     *            somme des parts de tous les organismes de la vente
     */
    public static Controle montant(long base, Integer taux, long part, long montantVente, long sommeParts) {
        int t = taux == null ? 0 : taux;
        if (part < 0) {
            return new Controle(MONTANT, Niveau.ALERTE, "Part négative : " + part);
        }
        if (part == 0 && t > 0) {
            return new Controle(MONTANT, Niveau.ALERTE, "Part nulle avec un taux de " + t + " %");
        }
        if (part > montantVente) {
            return new Controle(MONTANT, Niveau.ALERTE, "Part " + part + " plus grande que la vente " + montantVente);
        }
        if (sommeParts > montantVente) {
            return new Controle(MONTANT, Niveau.ALERTE,
                    "Parts des organismes " + sommeParts + " plus grandes que la vente " + montantVente);
        }
        long a = attendu(base, t);
        if (a == part) {
            return new Controle(MONTANT, Niveau.OK, base + " × " + t + " % = " + a + " = part enregistrée " + part);
        }
        return new Controle(MONTANT, Niveau.INFO, base + " × " + t + " % = " + a + ", part enregistrée " + part
                + " (écart " + (part - a) + " : plafond ou prix de référence, à comparer au papier)");
    }

    /** Assure : matricule present et porte par ce seul client pour cet organisme. */
    public static Controle assure(String matricule, int autresClientsMemeMatricule) {
        if (matricule == null || matricule.trim().isEmpty()) {
            return new Controle(ASSURE, Niveau.ALERTE, "Matricule vide");
        }
        if (autresClientsMemeMatricule > 0) {
            return new Controle(ASSURE, Niveau.ALERTE, "Matricule " + matricule.trim() + " déjà pris par "
                    + autresClientsMemeMatricule + " autre(s) client(s) de cet organisme");
        }
        return new Controle(ASSURE, Niveau.OK, "Matricule " + matricule.trim());
    }

    /** Ayant droit : aucun (l'assure lui-meme) ou rattache a cet assure. */
    public static Controle ayantDroit(boolean present, boolean rattacheAuClient) {
        if (!present) {
            return new Controle(AYANT_DROIT, Niveau.OK, "L'assuré lui-même");
        }
        if (!rattacheAuClient) {
            return new Controle(AYANT_DROIT, Niveau.ALERTE, "Ayant droit rattaché à un autre client");
        }
        return new Controle(AYANT_DROIT, Niveau.OK, "Ayant droit rattaché à l'assuré");
    }

    /** Produits et prix : lignes a comparer au papier ; alerte si aucune ligne. */
    public static Controle produits(int lignes, int prixDifferentsDeLaFiche) {
        if (lignes == 0) {
            return new Controle(PRODUITS, Niveau.ALERTE, "Aucune ligne de produit");
        }
        if (prixDifferentsDeLaFiche > 0) {
            return new Controle(PRODUITS, Niveau.INFO,
                    lignes + " ligne(s), " + prixDifferentsDeLaFiche + " prix différent(s) du prix actuel de la fiche");
        }
        return new Controle(PRODUITS, Niveau.INFO, lignes + " ligne(s) à comparer au papier");
    }

    /** Niveau d'ensemble des controles automatiques : le plus grave. */
    public static Niveau pire(Controle... c) {
        Niveau n = Niveau.OK;
        for (Controle x : c) {
            if (x.niveau == Niveau.ALERTE) {
                return Niveau.ALERTE;
            }
            if (x.niveau == Niveau.INFO) {
                n = Niveau.INFO;
            }
        }
        return n;
    }

    /**
     * Etat de pointage d'un bon : A_POINTER sans pointage, ou si le bon a change depuis (montant ou date de mise a
     * jour) ; sinon le resultat garde (CONFORME, ANOMALIE, ABSENT).
     */
    public static String etat(String resultat, Integer prixPointe, LocalDateTime majPointee, int prixActuel,
            LocalDateTime majActuelle) {
        if (resultat == null) {
            return "A_POINTER";
        }
        boolean prixChange = prixPointe == null || prixPointe != prixActuel;
        boolean majChange = majPointee != null && majActuelle != null && majActuelle.isAfter(majPointee);
        return prixChange || majChange ? "A_POINTER" : resultat;
    }
}
