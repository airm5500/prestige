package rest.service;

import dal.TUser;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Chiffre d'affaires par zone geographique et par famille d'articles, ventile par tranches de periode (point 3).
 */
@Local
public interface CaZoneGeoService {

    /**
     * Regroupement des lignes : par zone, par famille, zone puis famille, et (retours du 12/09, point 9) par gamme ou
     * par laboratoire, sur les memes tranches et les memes filtres.
     */
    enum Regroupement {
        ZONE, FAMILLE, ZONE_FAMILLE, GAMME, LABORATOIRE;

        public static Regroupement de(String valeur) {
            if (valeur == null) {
                return ZONE;
            }
            try {
                return valueOf(valeur.trim().toUpperCase(java.util.Locale.ROOT));
            } catch (IllegalArgumentException e) {
                return ZONE;
            }
        }
    }

    /**
     * Produits pris en compte dans une ligne de l'analyse (point 19).
     *
     * <p>
     * Memes criteres que l'analyse - periode, emplacement, ventes cloturees non annulees - restreints a la zone et a la
     * famille de la ligne cliquee. Chaque produit rend son code, sa designation, son prix d'achat, son prix de vente,
     * la quantite totale et le montant ; les totaux suivent la formule unique de {@link util.CalculMarge}.
     * </p>
     *
     * @param zoneId
     *            zone de la ligne, ou {@code null} quand la ligne n'est pas regroupee par zone
     * @param familleId
     *            famille de la ligne, ou {@code null} quand la ligne n'est pas regroupee par famille
     */
    org.json.JSONObject produitsDeLaLigne(dal.TUser utilisateur, Filtres filtres, String zoneId, String familleId);

    /** Parametres de la recherche. */
    final class Filtres {

        private util.PeriodesCa.Type typePeriode = util.PeriodesCa.Type.TROIS_MOIS;
        private java.time.LocalDate debut;
        private java.time.LocalDate fin;
        private String zoneId;
        private String familleId;
        private String gammeId;
        private String laboratoireId;
        /*
         * Gamme ou laboratoire de la LIGNE cliquee (detail de l'onglet Gammes / Laboratoires, retours du 12/09) : null
         * quand la ligne n'est pas regroupee dessus, chaine vide pour « sans gamme / laboratoire ».
         */
        private String ligneGammeId;
        private String ligneLaboratoireId;
        private Regroupement regroupement = Regroupement.ZONE;

        public util.PeriodesCa.Type getTypePeriode() {
            return typePeriode;
        }

        public Filtres typePeriode(util.PeriodesCa.Type typePeriode) {
            this.typePeriode = typePeriode;
            return this;
        }

        public java.time.LocalDate getDebut() {
            return debut;
        }

        public Filtres debut(java.time.LocalDate debut) {
            this.debut = debut;
            return this;
        }

        public java.time.LocalDate getFin() {
            return fin;
        }

        public Filtres fin(java.time.LocalDate fin) {
            this.fin = fin;
            return this;
        }

        public String getZoneId() {
            return zoneId;
        }

        public Filtres zoneId(String zoneId) {
            this.zoneId = zoneId;
            return this;
        }

        public String getFamilleId() {
            return familleId;
        }

        public Filtres familleId(String familleId) {
            this.familleId = familleId;
            return this;
        }

        public String getGammeId() {
            return gammeId;
        }

        public Filtres gammeId(String gammeId) {
            this.gammeId = gammeId;
            return this;
        }

        public String getLaboratoireId() {
            return laboratoireId;
        }

        public Filtres laboratoireId(String laboratoireId) {
            this.laboratoireId = laboratoireId;
            return this;
        }

        public String getLigneGammeId() {
            return ligneGammeId;
        }

        public Filtres ligneGammeId(String ligneGammeId) {
            this.ligneGammeId = ligneGammeId;
            return this;
        }

        public String getLigneLaboratoireId() {
            return ligneLaboratoireId;
        }

        public Filtres ligneLaboratoireId(String ligneLaboratoireId) {
            this.ligneLaboratoireId = ligneLaboratoireId;
            return this;
        }

        public Regroupement getRegroupement() {
            return regroupement;
        }

        public Filtres regroupement(Regroupement regroupement) {
            this.regroupement = regroupement;
            return this;
        }
    }

    /**
     * Reponse {success, tranches:[{cle, libelle, debut, fin}], granularite, data:[lignes], total, totauxTranches:{cle:
     * montant}, totalGeneral}. Chaque ligne : zoneId, zone, familleId, famille, libelle, un champ « t_&lt;cle&gt; » par
     * tranche, total, evolution (pourcentage entre la premiere et la derniere tranche, null si la premiere est a zero).
     */
    JSONObject chiffreAffaires(TUser utilisateur, Filtres filtres);
}
