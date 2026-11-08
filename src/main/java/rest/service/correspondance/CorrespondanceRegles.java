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
        CODE_GROSSISTE, CIP, EAN, HUMAIN
    }

    public enum Motif {
        CONSERVEE, CODE_VIDE, CODE_AMBIGU, DESACCORD_CODE_CLE, CODE_GROSSISTE_CONNU, CLE_UNIQUE, CLE_AMBIGUE,
        INTROUVABLE
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
