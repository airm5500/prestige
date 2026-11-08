package rest.service.correspondance;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.json.JSONArray;

/**
 * Correspondance produits grossistes / Prestige, lot 1 : decision PURE sur les cles exactes (aucun acces a la base). Le
 * service fournit, pour un code lu chez un grossiste, les fiches actives qui portent deja ce code pour ce grossiste
 * ({@code t_famille_grossiste}) et celles dont un CIP / EAN / CIP2-4 vaut ce code. Ordre des regles :
 * <ol>
 * <li>correspondance VALIDEE, REJETEE ou CONTREDITE deja enregistree : conservee, jamais recalculee ;</li>
 * <li>code vide : rien (un code vide ne rapproche jamais) ;</li>
 * <li>code connu pour plusieurs fiches : a valider (CODE_AMBIGU) ;</li>
 * <li>code connu pour une fiche, mais CIP/EAN d'une seule AUTRE fiche : a valider (DESACCORD_CODE_CLE) ;</li>
 * <li>code connu pour une fiche : AUTO_EXACTE, score 1 ;</li>
 * <li>sinon CIP/EAN d'une seule fiche : AUTO_EXACTE, score 0,99 ; de plusieurs : a valider (CLE_AMBIGUE) ;</li>
 * <li>sinon introuvable : rien (le rapprochement approche viendra au lot 3).</li>
 * </ol>
 * Codes compares en chaines, blancs retires et casse ignoree : « 0123 » et « 123 » restent differents.
 */
public final class CorrespondanceRegles {

    public enum Etat {
        AUTO_EXACTE, PROPOSEE, VALIDEE, REJETEE, CONTREDITE
    }

    public enum Source {
        CODE_GROSSISTE, CIP, EAN, HUMAIN, BL,
        /** rapprochement par la designation (lot 3) : toujours a valider */
        APPROCHE
    }

    public enum Motif {
        CONSERVEE, CODE_VIDE, CODE_AMBIGU, DESACCORD_CODE_CLE, CODE_GROSSISTE_CONNU, CLE_UNIQUE, CLE_AMBIGUE,
        INTROUVABLE,
        /** correspondance apprise d'un BL cloture (lot 2), jamais produite par {@link #decider} */
        RECU_EN_BL,
        /** proposition par la designation (lot 3, {@link CorrespondanceApprochee}), jamais produite par {@link #decider} */
        DESIGNATION
    }

    /** Score d'une correspondance apprise d'un BL cloture : produit recu et entre en stock sous ce code. */
    public static final BigDecimal SCORE_BL = new BigDecimal("0.950");

    /**
     * Lot 2 : un code lu a l'import d'un fichier grossiste, recu sur un BL cloture pour la fiche {@code recue}.
     * <ul>
     * <li>aucune correspondance : CREER (AUTO_EXACTE, source BL) ;</li>
     * <li>meme fiche (ou fiche parmi les candidats d'une PROPOSEE) : CONFIRMER, etat inchange ;</li>
     * <li>AUTO_EXACTE pour une autre fiche : CONTREDIRE, l'etat passe CONTREDITE, la fiche d'origine reste ;</li>
     * <li>VALIDEE, CONTREDITE ou PROPOSEE pour une autre fiche, et toute REJETEE : SIGNALER, etat et fiche
     * inchanges.</li>
     * </ul>
     * Exactement un compteur (confirmations ou contradictions) augmente de 1.
     */
    public static final class Reception {
        public enum Action {
            CREER, CONFIRMER, CONTREDIRE, SIGNALER
        }

        public final Action action;
        public final Etat etatApres;
        public final String familleApres;
        public final String familleContradiction;
        public final int confirmations;
        public final int contradictions;
        public final Source sourceCreation;

        Reception(Action action, Etat etatApres, String familleApres, String familleContradiction) {
            this.action = action;
            this.etatApres = etatApres;
            this.familleApres = familleApres;
            this.familleContradiction = familleContradiction;
            boolean contre = action == Action.CONTREDIRE || action == Action.SIGNALER;
            this.confirmations = contre ? 0 : 1;
            this.contradictions = contre ? 1 : 0;
            this.sourceCreation = action == Action.CREER ? Source.BL : null;
        }
    }

    public static Reception recevoir(Etat etat, String famille, List<String> candidats, String recue) {
        if (etat == null) {
            return new Reception(Reception.Action.CREER, Etat.AUTO_EXACTE, recue, null);
        }
        boolean meme = recue.equals(famille);
        switch (etat) {
        case AUTO_EXACTE:
            return meme ? new Reception(Reception.Action.CONFIRMER, etat, famille, null)
                    : new Reception(Reception.Action.CONTREDIRE, Etat.CONTREDITE, famille, recue);
        case VALIDEE:
        case CONTREDITE:
            return meme ? new Reception(Reception.Action.CONFIRMER, etat, famille, null)
                    : new Reception(Reception.Action.SIGNALER, etat, famille, recue);
        case PROPOSEE:
            return candidats != null && candidats.contains(recue)
                    ? new Reception(Reception.Action.CONFIRMER, etat, famille, null)
                    : new Reception(Reception.Action.SIGNALER, etat, famille, recue);
        default:
            return new Reception(Reception.Action.SIGNALER, etat, famille, recue);
        }
    }

    public static final BigDecimal SCORE_CODE = new BigDecimal("1.000");
    public static final BigDecimal SCORE_CLE = new BigDecimal("0.990");
    public static final BigDecimal SCORE_A_VALIDER = new BigDecimal("0.500");

    /** Longueur a partir de laquelle une cle est traitee comme un EAN. */
    static final int LONGUEUR_EAN = 13;

    private CorrespondanceRegles() {
    }

    /** Code compare : blancs retires, majuscules ; null devient vide. */
    public static String normaliser(String code) {
        return code == null ? "" : code.replaceAll("\\s+", "").toUpperCase();
    }

    /** Ce qui est connu d'un code lu chez un grossiste. */
    public static final class Entree {
        public final String code;
        public final List<String> parCodeGrossiste;
        public final List<String> parCle;
        public final Etat etatExistant;
        public final String familleExistante;

        public Entree(String code, List<String> parCodeGrossiste, List<String> parCle, Etat etatExistant,
                String familleExistante) {
            this.code = code;
            this.parCodeGrossiste = parCodeGrossiste == null ? Collections.emptyList() : parCodeGrossiste;
            this.parCle = parCle == null ? Collections.emptyList() : parCle;
            this.etatExistant = etatExistant;
            this.familleExistante = familleExistante;
        }

        @Override
        public String toString() {
            return "code=" + parCodeGrossiste + " cle=" + parCle + " existant=" + etatExistant + "/" + familleExistante;
        }
    }

    /** Resultat : etat null = rien a ecrire. */
    public static final class Decision {
        public final Etat etat;
        public final String familleId;
        public final Source source;
        public final Motif motif;
        public final BigDecimal score;
        public final List<String> candidats;

        Decision(Etat etat, String familleId, Source source, Motif motif, BigDecimal score, List<String> candidats) {
            this.etat = etat;
            this.familleId = familleId;
            this.source = source;
            this.motif = motif;
            this.score = score;
            this.candidats = Collections.unmodifiableList(candidats);
        }

        public boolean aEcrire() {
            return etat != null;
        }

        /** Vrai si la ligne deja en base porte exactement cette decision (alors rien n'est reecrit). */
        public boolean identiqueA(Etat e, String famille, Source s, Motif m, BigDecimal sc, String candidatsJson) {
            return etat == e && Objects.equals(familleId, famille) && source == s && motif == m
                    && (score == null ? sc == null : sc != null && score.compareTo(sc) == 0)
                    && Objects.equals(candidatsJson(candidats), candidatsJson);
        }
    }

    public static String candidatsJson(List<String> candidats) {
        return new JSONArray(candidats).toString();
    }

    private static Decision rien(Motif m) {
        return new Decision(null, null, null, m, null, Collections.emptyList());
    }

    public static Decision decider(Entree e) {
        if (e.etatExistant == Etat.VALIDEE || e.etatExistant == Etat.REJETEE || e.etatExistant == Etat.CONTREDITE) {
            return rien(Motif.CONSERVEE);
        }
        String code = normaliser(e.code);
        if (code.isEmpty()) {
            return rien(Motif.CODE_VIDE);
        }
        Set<String> parCode = new LinkedHashSet<>(e.parCodeGrossiste);
        Set<String> parCle = new LinkedHashSet<>(e.parCle);
        Source sourceCle = code.length() >= LONGUEUR_EAN ? Source.EAN : Source.CIP;
        Set<String> tous = new LinkedHashSet<>(parCode);
        tous.addAll(parCle);
        List<String> candidats = new ArrayList<>(tous);

        if (parCode.size() > 1) {
            return new Decision(Etat.PROPOSEE, null, Source.CODE_GROSSISTE, Motif.CODE_AMBIGU, SCORE_A_VALIDER,
                    candidats);
        }
        if (parCode.size() == 1) {
            String f = parCode.iterator().next();
            if (parCle.size() == 1 && !parCle.contains(f)) {
                return new Decision(Etat.PROPOSEE, null, Source.CODE_GROSSISTE, Motif.DESACCORD_CODE_CLE,
                        SCORE_A_VALIDER, candidats);
            }
            return new Decision(Etat.AUTO_EXACTE, f, Source.CODE_GROSSISTE, Motif.CODE_GROSSISTE_CONNU, SCORE_CODE,
                    Collections.singletonList(f));
        }
        if (parCle.size() == 1) {
            String f = parCle.iterator().next();
            return new Decision(Etat.AUTO_EXACTE, f, sourceCle, Motif.CLE_UNIQUE, SCORE_CLE,
                    Collections.singletonList(f));
        }
        if (parCle.size() > 1) {
            return new Decision(Etat.PROPOSEE, null, sourceCle, Motif.CLE_AMBIGUE, SCORE_A_VALIDER, candidats);
        }
        return rien(Motif.INTROUVABLE);
    }
}
