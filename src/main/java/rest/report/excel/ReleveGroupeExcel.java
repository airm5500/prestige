package rest.report.excel;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import rest.service.ModeRegroupement;
import rest.service.dto.ReleveGroupeDTO;
import rest.service.dto.ReleveGroupeFactureDTO;
import rest.service.dto.ReleveGroupeLigneDTO;

/**
 * Plan du 19/11, point 14 : releve des factures de groupe en Excel, avec les deux sous-totaux du PDF (menu « Relevé » :
 * par facture de groupe ou par tiers payant). Memes donnees que le PDF (meme service, meme tri), memes blocs :
 * <ul>
 * <li>par groupe de tiers payants, les factures ; un sous-total a chaque changement de facture de groupe (ou
 * d'organisme), comme le regroupement du PDF ;</li>
 * <li>un total par groupe, puis le total general (nombre de factures, facture, regle, reste).</li>
 * </ul>
 */
public final class ReleveGroupeExcel {

    public static final String FACTURE = "Facture";
    public static final String SOUS_TOTAL = "Sous-total";
    public static final String TOTAL_GROUPE = "Total groupe";
    public static final String TOTAL_GENERAL = "Total général";

    private ReleveGroupeExcel() {
    }

    /**
     * Une ligne : nature, groupe, facture de groupe, n° facture, tiers payant, periode, facture, regle, reste, statut.
     */
    public static final class Ligne {
        public final String nature;
        public final String groupe;
        public final String factureGroupe;
        public final String facture;
        public final String tiersPayant;
        public final String periode;
        public final BigDecimal montant;
        public final BigDecimal regle;
        public final BigDecimal reste;
        public final String statut;

        Ligne(String nature, String groupe, String factureGroupe, String facture, String tiersPayant, String periode,
                BigDecimal montant, BigDecimal regle, BigDecimal reste, String statut) {
            this.nature = nature;
            this.groupe = groupe;
            this.factureGroupe = factureGroupe;
            this.facture = facture;
            this.tiersPayant = tiersPayant;
            this.periode = periode;
            this.montant = montant;
            this.regle = regle;
            this.reste = reste;
            this.statut = statut;
        }
    }

    private static BigDecimal z(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    /** Lignes de l'Excel, dans l'ordre du PDF. */
    public static List<Ligne> lignes(ReleveGroupeFactureDTO d, String regroupement) {
        boolean parTiers = ModeRegroupement.PAR_TIERS_PAYANT.equals(ModeRegroupement.normaliser(regroupement));
        List<Ligne> l = new ArrayList<>();
        int nb = 0;
        for (ReleveGroupeDTO g : d.getGroupes()) {
            String groupe = g.getGroupeLibelle();
            String cle = null;
            BigDecimal[] st = null;
            int nbBloc = 0;
            for (ReleveGroupeLigneDTO f : g.getFactures()) {
                String k = parTiers ? f.getTiersPayant() : f.getCodeFactureGroupe();
                if (st != null && !Objects.equals(k, cle)) {
                    l.add(sousTotal(groupe, cle, parTiers, nbBloc, st));
                    st = null;
                }
                if (st == null) {
                    st = new BigDecimal[] { BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO };
                    cle = k;
                    nbBloc = 0;
                }
                st[0] = st[0].add(z(f.getMontantFacture()));
                st[1] = st[1].add(z(f.getMontantRegle()));
                st[2] = st[2].add(z(f.getMontantRestant()));
                nbBloc++;
                nb++;
                l.add(new Ligne(FACTURE, groupe, f.getCodeFactureGroupe(), f.getCodeFacture(), f.getTiersPayant(),
                        f.getPeriode(), z(f.getMontantFacture()), z(f.getMontantRegle()), z(f.getMontantRestant()),
                        f.getStatut()));
            }
            if (st != null) {
                l.add(sousTotal(groupe, cle, parTiers, nbBloc, st));
            }
            l.add(new Ligne(TOTAL_GROUPE, groupe, "", nombre(g.getFactures().size(), "facture"), "", "",
                    z(g.getMontantFacture()), z(g.getMontantRegle()), z(g.getMontantRestant()), ""));
        }
        l.add(new Ligne(TOTAL_GENERAL, "", "", nombre(nb, "facture"), "", "", z(d.getMontantFacture()),
                z(d.getMontantRegle()), z(d.getMontantRestant()), ""));
        return l;
    }

    private static Ligne sousTotal(String groupe, String cle, boolean parTiers, int n, BigDecimal[] st) {
        return parTiers ? new Ligne(SOUS_TOTAL, groupe, "", nombre(n, "facture"), cle, "", st[0], st[1], st[2], "")
                : new Ligne(SOUS_TOTAL, groupe, cle, nombre(n, "organisme"), "", "", st[0], st[1], st[2], "");
    }

    /** Comme le PDF : « 1 facture », « 3 factures », « 18 organismes ». */
    static String nombre(int n, String mot) {
        return n + " " + mot + (n > 1 ? "s" : "");
    }

    public static byte[] construire(ReleveGroupeFactureDTO d, String regroupement, String periode) throws IOException {
        boolean parTiers = ModeRegroupement.PAR_TIERS_PAYANT.equals(ModeRegroupement.normaliser(regroupement));
        return new ClasseurExcel<Ligne>("Relevé factures de groupe").titre("RELEVÉ DES FACTURES DE GROUPE")
                .critere("Période", periode)
                .critere("Sous-totaux", parTiers ? "par tiers payant" : "par facture de groupe")
                .texte("Ligne", x -> x.nature).texte("Groupe", x -> x.groupe)
                .texte("Facture de groupe", x -> x.factureGroupe).texte("N° facture", x -> x.facture)
                .texte("Tiers payant", x -> x.tiersPayant).texte("Période facturée", x -> x.periode)
                .nombre("Montant facturé", x -> x.montant).nombre("Montant réglé", x -> x.regle)
                .nombre("Reste à régler", x -> x.reste).texte("Statut", x -> x.statut)
                .construire(lignes(d, regroupement));
    }
}
