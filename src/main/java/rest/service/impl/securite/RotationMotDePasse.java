package rest.service.impl.securite;

import java.util.ArrayList;
import java.util.List;

/**
 * ROTATION TRANSACTIONNELLE du mot de passe de la base (cas 4, lot 4.B, S1) : l'ordre des etapes et le retour arriere,
 * independants de MariaDB et de Payara (les etapes sont fournies). Aucune valeur de mot de passe ne figure dans le
 * resultat ni dans les libelles.
 * <ol>
 * <li>ALTER USER avec le compte de rotation (nouveau mot de passe) ;</li>
 * <li>mise a jour de Payara (propriete du pool ou alias) ;</li>
 * <li>pool redemarre et connexion testee.</li>
 * </ol>
 * Si 2 ou 3 echoue : Payara est retabli (meme si 2 a echoue : la valeur a pu etre posee avant l'echec) puis ALTER USER
 * inverse avec l'ancien mot de passe quand il est connu ; sinon le resultat dit exactement ou en est chaque cote.
 */
public final class RotationMotDePasse {

    /** Les trois actions reelles, plus le retablissement de Payara ; chacune echoue par une exception. */
    public interface Etapes {
        void alterUser(String motDePasse) throws Exception;

        void majPayara(String motDePasse) throws Exception;

        void tester() throws Exception;

        void retablirPayara() throws Exception;
    }

    public static final class Resultat {
        public boolean ok;
        public boolean retourArriere;
        /** MariaDB et Payara peuvent ne plus porter le meme mot de passe : intervention necessaire. */
        public boolean incoherent;
        /** Le domaine Payara redemarre (lance apres un succes). */
        public boolean redemarrage;
        public String message = "";
        public final List<String> etapes = new ArrayList<>();

        public String detail() {
            return String.join(" ; ", etapes);
        }
    }

    private RotationMotDePasse() {
    }

    /**
     * @param ancien
     *            l'ancien mot de passe quand il est connu (pool en clair), sinon null : le retour arriere de MariaDB
     *            est alors impossible et le resultat le dit.
     */
    public static Resultat executer(String ancien, String nouveau, Etapes e) {
        Resultat r = new Resultat();
        try {
            e.alterUser(nouveau);
            r.etapes.add("MariaDB : mot de passe changé");
        } catch (Exception ex) {
            r.etapes.add("MariaDB a refusé le changement : " + cause(ex));
            r.message = "Rien n'a été changé : " + cause(ex);
            return r;
        }
        boolean payaraFait = false;
        try {
            e.majPayara(nouveau);
            payaraFait = true;
            r.etapes.add("Payara : pool mis à jour");
            e.tester();
            r.etapes.add("Connexion par le pool vérifiée");
            r.ok = true;
            r.message = "Mot de passe de la base changé et vérifié.";
            return r;
        } catch (Exception ex) {
            r.etapes.add((payaraFait ? "Connexion par le pool en échec : " : "Payara a refusé la mise à jour : ")
                    + cause(ex));
        }
        /*
         * retour arriere : Payara d'abord (la mise a jour a pu echouer apres avoir pose la valeur : le retablissement
         * est idempotent), puis MariaDB
         */
        try {
            e.retablirPayara();
            r.etapes.add("Payara rétabli");
        } catch (Exception ex) {
            r.etapes.add("Payara non rétabli : " + cause(ex));
            r.incoherent = true;
        }
        if (ancien == null) {
            r.etapes.add("Ancien mot de passe inconnu (alias) : MariaDB garde le nouveau");
            r.incoherent = true;
        } else {
            try {
                e.alterUser(ancien);
                r.etapes.add("MariaDB : ancien mot de passe remis");
                if (!r.incoherent) {
                    try {
                        e.tester();
                        r.etapes.add("Connexion par le pool vérifiée avec l'ancien mot de passe");
                    } catch (Exception ex) {
                        r.etapes.add("Connexion par le pool toujours en échec : " + cause(ex));
                    }
                }
            } catch (Exception ex) {
                r.etapes.add("ALTER USER inverse en échec : " + cause(ex));
                r.incoherent = true;
            }
        }
        r.retourArriere = !r.incoherent;
        r.message = r.incoherent
                ? "Échec et retour arrière incomplet : MariaDB et Payara peuvent ne plus porter le même mot de passe."
                        + " Relancez la rotation : le compte de rotation peut toujours fixer un nouveau mot de passe."
                : "Échec : tout est revenu à l'ancien mot de passe.";
        return r;
    }

    /** Cause racine, sans valeur de mot de passe (un ordre SQL ou une URL recopies par un pilote sont masques). */
    public static String cause(Throwable e) {
        Throwable t = e;
        while (t.getCause() != null && t.getCause() != t) {
            t = t.getCause();
        }
        String m = t.getMessage() == null ? t.getClass().getSimpleName() : t.getMessage();
        return m.replaceAll("(?i)IDENTIFIED BY\\s+'[^']*'", "IDENTIFIED BY ***").replaceAll("(?i)password=[^\\s&;]+",
                "password=***");
    }
}
