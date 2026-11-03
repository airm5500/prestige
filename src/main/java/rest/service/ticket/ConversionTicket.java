package rest.service.ticket;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import rest.service.ticket.TicketDocument.Bloc;
import rest.service.ticket.TicketDocument.Style;

/**
 * Passage des lignes que Prestige prepare pour l'ancien ticket au nouveau modele (demande du 02/11).
 *
 * <p>
 * Les regles de calcul (monnaie, paiement fractionne, avoir, differe, parts des tiers-payants) restent celles qui
 * produisent ces lignes aujourd'hui : on ne les recalcule pas, on les met en forme. Seuls s'ajoutent les designations
 * completes, le lot vendu et le recapitulatif « articles · boites », a partir des lignes de la vente.
 */
public final class ConversionTicket {

    /** Une ligne de vente, entiere : la designation n'est plus coupee a 20 caracteres. */
    public static final class Article {
        public final String designation;
        public final int quantite;
        public final int prixUnitaire;
        public final int montant;
        public final String lot;

        public Article(String designation, int quantite, int prixUnitaire, int montant, String lot) {
            this.designation = designation == null ? "" : designation;
            this.quantite = quantite;
            this.prixUnitaire = prixUnitaire;
            this.montant = montant;
            this.lot = lot == null ? "" : lot;
        }
    }

    /** Tout ce que l'ancien ticket recevait, plus les informations du nouveau modele. */
    public static final class Source {
        public ModeleTicket ticket;
        public int papierMm = 80;
        public String nomOfficine = "";
        public String pharmacien = "";
        public String adresse = "";
        public String telephone = "";
        public String autresTelephones = "";
        public String enTete = "";
        public String cc = "";
        public String rc = "";
        public String commentaire1 = "";
        public String commentaire2 = "";
        public String titre = "";
        public Date operation;
        public String imageCode = "";
        public String referencePied = "";
        public List<String> datas = Collections.emptyList();
        public List<String> infoSellers = Collections.emptyList();
        public List<String> infoTiersPayants = Collections.emptyList();
        public List<String> subtotal = Collections.emptyList();
        public List<String> commentaires = Collections.emptyList();
        /** Lignes de la vente (page en cours) ; vide : on lit les lignes de l'ancien ticket. */
        public List<Article> articles = Collections.emptyList();
        /** Ventes ou factures reglees : reference et montant. */
        public List<String[]> pieces = Collections.emptyList();
        /** Encours du carnet apres la vente, deja mis en forme ; vide si inconnu. */
        public String encoursCarnet = "";
    }

    private final Source s;
    private final ReglagesTicket r;
    private final TicketDocument doc;
    private final boolean court;

    private ConversionTicket(Source s, ReglagesTicket r) {
        this.s = s;
        this.r = r;
        this.doc = new TicketDocument(s.ticket);
        this.court = s.papierMm <= 58;
    }

    public static TicketDocument convertir(Source s, ReglagesTicket r) {
        ConversionTicket c = new ConversionTicket(s, r);
        c.entete();
        if (s.ticket == ModeleTicket.PREVENTE) {
            c.prevente();
        } else if (s.ticket == ModeleTicket.MOUVEMENT_CAISSE) {
            c.mouvement();
        } else if (s.ticket == ModeleTicket.TICKET_Z) {
            c.ticketZ();
        } else if (s.ticket == ModeleTicket.REGLEMENT_DIFFERE || s.ticket == ModeleTicket.REGLEMENT_FACTURE
                || s.ticket == ModeleTicket.REGLEMENT_CARNET_DEPOT) {
            c.reglement();
        } else {
            c.vente();
        }
        c.pied();
        return c.doc;
    }

    /* ---------- en-tete ---------- */

    private void entete() {
        doc.bloc(TicketDocument.ENTETE).texte(s.nomOfficine, Style.NOM);
        Bloc c = doc.bloc(TicketDocument.COORDONNEES);
        String tel = telephones(s.telephone, s.autresTelephones);
        if (s.ticket == ModeleTicket.PREVENTE) {
            c.texte(tel.isEmpty() ? "" : "Tél. " + tel, Style.NORMAL);
            return;
        }
        c.texte(s.pharmacien, Style.NORMAL);
        c.texte(s.adresse, Style.NORMAL);
        if (!tel.isEmpty()) {
            if (court && tel.contains(" · ")) {
                for (String t : tel.split(" · ")) {
                    c.texte("Tél. " + t, Style.NORMAL);
                }
            } else {
                c.texte("Tél. " + tel, Style.NORMAL);
            }
        }
        if (r.ccRc()) {
            String ccrc = (vide(s.cc) ? "" : "CC " + s.cc.trim()) + (vide(s.cc) || vide(s.rc) ? "" : " · ")
                    + (vide(s.rc) ? "" : "RC " + s.rc.trim());
            c.texte(ccrc, Style.PETIT);
        }
        if (r.commentaires()) {
            c.texte(s.enTete, Style.NORMAL);
        }
        doc.bloc(TicketDocument.COORDONNEES).trait(true);
    }

    /** Telephone principal et autres numeros de l'identification officine, separes par « · ». */
    static String telephones(String principal, String autres) {
        List<String> l = new ArrayList<>();
        for (String t : Arrays.asList(principal, autres)) {
            if (t == null) {
                continue;
            }
            for (String n : t.split("[;/,|]")) {
                String x = n.trim();
                if (!x.isEmpty() && !l.contains(x)) {
                    l.add(x);
                }
            }
        }
        return String.join(" · ", l);
    }

    /* ---------- ventes ---------- */

    private void vente() {
        doc.bloc(TicketDocument.TITRE).texte(titreVente(s.titre), Style.GRAND);
        intervenants();
        clients();
        Bloc corps = doc.bloc(TicketDocument.CORPS);
        corps.trait(false);
        int articles = 0;
        int boites = 0;
        String total = "";
        if (!s.articles.isEmpty()) {
            for (Article a : s.articles) {
                corps.article(a.designation, a.quantite + " × " + nombre(a.prixUnitaire), r.lot() ? a.lot : "",
                        nombre(a.montant));
                articles++;
                boites += Math.abs(a.quantite);
            }
        }
        for (String l : s.datas) {
            String[] p = l.split(";", -1);
            if (p.length < 5) {
                continue;
            }
            if (p[0].trim().isEmpty() && p[2].trim().isEmpty()) {
                if (!p[4].contains("-") || p[4].matches(".*\\d.*")) {
                    total = p[4].trim();
                }
                continue;
            }
            if (s.articles.isEmpty()) {
                corps.article(p[2].trim(), p[0].trim() + " × " + montant(p[3]), "", montant(p[4]));
                articles++;
                boites += Math.abs(entier(p[0]));
            }
        }
        corps.trait(false);
        if (r.recapitulatif() && articles > 0) {
            doc.bloc(TicketDocument.RECAP).texte(articles + (articles > 1 ? " articles" : " article") + " · " + boites
                    + (boites > 1 ? " boîtes" : " boîte"), Style.PETIT);
        }
        sousTotaux(total);
        mentions();
        if (s.ticket == ModeleTicket.VENTE_CARNET) {
            if (r.encoursCarnet() && !vide(s.encoursCarnet)) {
                doc.bloc(TicketDocument.MENTIONS).paire("Encours du carnet après la vente", s.encoursCarnet,
                        Style.PETIT);
            }
            if (r.signatureClient()) {
                doc.bloc(TicketDocument.SIGNATURES).signatures(Collections.singletonList("Signature du client"));
            }
        }
        if (r.commentaires()) {
            Bloc c = doc.bloc(TicketDocument.COMMENTAIRE);
            c.trait(false);
            c.texte(s.commentaire1, Style.NORMAL);
            c.texte(s.commentaire2, Style.NORMAL);
            if (c.elements.size() == 1) {
                c.elements.clear();
            }
        }
    }

    /** « Ticket N° 0127 | Bon N°:: 558213 » devient « TICKET N° 0127 · Bon N° 558213 ». */
    static String titreVente(String titre) {
        if (titre == null) {
            return "";
        }
        String t = titre.replace("::", "").replaceAll("\\s+", " ").trim();
        t = t.replaceFirst("(?i)^ticket", "TICKET").replace(" | ", " · ");
        return t;
    }

    private void intervenants() {
        Bloc b = doc.bloc(TicketDocument.INTERVENANTS);
        for (String l : s.infoSellers) {
            if (l == null || l.trim().isEmpty()) {
                continue;
            }
            if (l.contains("|") && l.contains("::")) {
                String[] p = l.split("\\|");
                b.paire(libelleValeur(p[0], "Caisse"), libelleValeur(p[1], "Vendeur"), Style.PETIT);
            } else if (l.startsWith("Opérateur")) {
                b.texte(libelleValeur(l, "Caisse"), Style.PETIT);
            } else if (l.startsWith("Dépôt") || l.startsWith("Client")) {
                String[] lv = coupe(l);
                doc.bloc(TicketDocument.CLIENT).paire(lv[0], lv[1], Style.NORMAL);
            } else {
                b.texte(l.replace("::", ":").replaceAll("\\s+", " ").trim(), Style.PETIT);
            }
        }
    }

    /** « Caissier(e):: A.KONE » devient « Caisse : A.KONE ». */
    private static String libelleValeur(String l, String libelle) {
        String[] lv = coupe(l);
        return libelle + " : " + lv[1];
    }

    private void clients() {
        Bloc b = doc.bloc(TicketDocument.CLIENT);
        for (String l : s.infoTiersPayants) {
            if (l == null || l.trim().isEmpty()) {
                continue;
            }
            String[] lv = coupe(l);
            String libelle = lv[0].replace("Nom du Client", "Client").replace("Matricule Assuré", "Matricule assuré")
                    .replace("Part du Client", "Part du client").replaceAll("(\\d)%", "$1 %");
            b.paire(libelle, montantF(lv[1]), Style.NORMAL);
        }
        if (!b.vide()) {
            b.elements.add(0,
                    new TicketDocument.Element(TicketDocument.Genre.TRAIT, Style.NORMAL, null, null, null, null, null));
        }
    }

    /** Lignes « libelle;valeur;unite;gras » : remise, net, reglements, versement, monnaie. */
    private void sousTotaux(String total) {
        Bloc totaux = doc.bloc(TicketDocument.TOTAUX);
        Bloc reglement = doc.bloc(TicketDocument.REGLEMENT);
        String mode = "";
        boolean modeDit = false;
        boolean remise = false;
        boolean terme = false;
        for (String l : s.subtotal) {
            String[] p = l.split(";", -1);
            String libelle = p[0].replace(":", "").trim();
            String valeur = p.length > 1 ? p[1].trim() : "";
            if (libelle.equals("*")) {
                remise = true;
                if (r.remise()) {
                    totaux.paire("*", "− " + montantF(valeur), Style.NORMAL);
                }
            } else if (libelle.startsWith("Vente à terme")) {
                terme = true;
                totaux.paire(s.ticket == ModeleTicket.VENTE_CARNET ? "Pris sur le carnet" : "Vente à terme",
                        montantF(valeur), Style.NORMAL);
            } else if (libelle.startsWith("Net à payer")) {
                doc.bloc(TicketDocument.NET).encadre(court ? "NET" : "NET À PAYER", montant(valeur) + " F CFA",
                        Style.GRAND);
            } else if (libelle.equals("Règlement")) {
                mode = valeur;
            } else if (libelle.startsWith("Montant Versé")) {
                if (!mode.isEmpty() && !estEspeces(mode)) {
                    reglement.paire("Règlement", mode, Style.NORMAL);
                }
                modeDit = true;
                reglement.paire(estEspeces(mode) ? "Espèces versées" : "Montant versé", montantF(valeur), Style.NORMAL);
            } else if (libelle.startsWith("Monnaie")) {
                reglement.paire("Monnaie rendue", montantF(valeur), Style.GRAS);
            } else if (!libelle.isEmpty()) {
                reglement.paire(libelle, montantF(valeur), Style.NORMAL);
                modeDit = true;
            }
        }
        if (!mode.isEmpty() && !modeDit) {
            reglement.paire("Règlement", mode, Style.NORMAL);
        }
        /* total avant remise : seulement s'il apprend quelque chose, et jamais quand la remise est masquee */
        if (!vide(total) && ((remise && r.remise()) || (!remise && terme))) {
            totaux.elements.add(0, new TicketDocument.Element(TicketDocument.Genre.PAIRE, Style.NORMAL, "Total",
                    montantF(total), null, null, null));
        }
    }

    private void mentions() {
        Bloc m = doc.bloc(TicketDocument.MENTIONS);
        for (String l : s.commentaires) {
            String[] p = l.split(";", -1);
            String t = p[0].trim();
            if (t.isEmpty() || t.equals(nul(s.commentaire1).trim()) || t.equals(nul(s.commentaire2).trim())) {
                continue;
            }
            boolean gras = p.length > 1 && "1".equals(p[1].trim());
            int i = t.indexOf(':');
            if (i > 0) {
                String libelle = t.substring(0, i).trim();
                libelle = libelle.equalsIgnoreCase("MONTANT RESTANT") ? "Reste à payer"
                        : libelle.substring(0, 1).toUpperCase() + libelle.substring(1).toLowerCase(Locale.FRENCH);
                m.paire(libelle, montant(t.substring(i + 1)), gras ? Style.GRAS : Style.NORMAL);
            } else {
                m.texte(t, gras ? Style.GRAS : Style.NORMAL);
            }
        }
    }

    /* ---------- prevente ---------- */

    private void prevente() {
        Bloc titre = doc.bloc(TicketDocument.TITRE, "C");
        titre.texte("PRÉVENTE", Style.PETIT);
        titre.texte("N° " + s.titre.replaceFirst("(?i)^.*N°\\s*", "").trim(), Style.NUMERO);
        String vendeur = "";
        for (String l : s.infoSellers) {
            String[] lv = coupe(l);
            if (lv[0].startsWith("Date")) {
                continue;
            }
            if (lv[0].startsWith("Vendeur")) {
                vendeur = lv[1];
            } else {
                doc.bloc(TicketDocument.CLIENT).paire(lv[0], lv[1], Style.NORMAL);
            }
        }
        String recap = s.articles.isEmpty() || !r.recapitulatif() ? "" : recap(s.articles);
        doc.bloc(TicketDocument.INTERVENANTS, "C").texte((vendeur.isEmpty() ? "" : "Vendeur : " + vendeur)
                + (vendeur.isEmpty() || recap.isEmpty() ? "" : " · ") + recap, Style.PETIT);
        doc.bloc(TicketDocument.CORPS).trait(false);
        String organisme = "";
        for (String l : s.datas) {
            String[] p = l.split(";", -1);
            String libelle = p[0].trim();
            String valeur = p.length > 1 ? p[1].trim() : "";
            if (libelle.startsWith("Net à payer") || libelle.equals("Part client")) {
                doc.bloc(TicketDocument.NET).encadre(court ? "NET" : "NET À PAYER", montant(valeur) + " F CFA",
                        Style.GRAND);
            } else if (libelle.equals("Remise")) {
                if (r.remise()) {
                    doc.bloc(TicketDocument.TOTAUX).paire("*", "− " + montantF(valeur), Style.NORMAL);
                }
            } else if (libelle.startsWith("Assurance") || libelle.startsWith("Carnet")) {
                organisme = (valeur + libelle.replaceFirst("^(Assurance|Carnet)", "")).replaceAll("(\\d)%", "$1 %")
                        .trim();
            } else if (libelle.startsWith("Part ")) {
                doc.bloc(TicketDocument.CLIENT).paire(organisme.isEmpty() ? libelle : organisme, montantF(valeur),
                        Style.NORMAL);
            }
        }
    }

    private static String recap(List<Article> l) {
        int boites = l.stream().mapToInt(a -> Math.abs(a.quantite)).sum();
        return l.size() + (l.size() > 1 ? " articles" : " article") + " · " + boites
                + (boites > 1 ? " boîtes" : " boîte");
    }

    /* ---------- mouvement de caisse ---------- */

    private void mouvement() {
        doc.bloc(TicketDocument.TITRE).texte(s.titre.toUpperCase(Locale.FRENCH), Style.GRAND);
        Bloc corps = doc.bloc(TicketDocument.CORPS);
        for (String l : s.datas) {
            String[] p = l.split(";", -1);
            String libelle = p[0].replace(":", "").trim();
            String valeur = p.length > 1 ? p[1].trim() : "";
            if (libelle.startsWith("Opérateur")) {
                doc.bloc(TicketDocument.INTERVENANTS).texte("Caisse : " + valeur, Style.PETIT);
            } else if (libelle.startsWith("Code comptable")) {
                if (!vide(valeur) && !"null".equals(valeur)) {
                    corps.paire("Compte", valeur, Style.NORMAL);
                }
            } else if (libelle.startsWith("Libellé")) {
                corps.paire("Mode", valeur, Style.NORMAL);
            } else if (libelle.startsWith("Montant")) {
                doc.bloc(TicketDocument.NET).encadre("MONTANT", montant(valeur) + " F CFA", Style.GRAND);
            } else if (!libelle.isEmpty()) {
                corps.paire(libelle, valeur, Style.NORMAL);
            }
        }
        boolean motif = false;
        for (String l : s.commentaires) {
            String t = l.split(";", -1)[0].trim();
            if (!t.isEmpty()) {
                if (!motif) {
                    corps.paire("Motif", "", Style.NORMAL);
                    motif = true;
                }
                corps.texte(t, Style.GRAS);
            }
        }
        if (r.signatures()) {
            doc.bloc(TicketDocument.SIGNATURES).signatures(Arrays.asList("Caissier", "Bénéficiaire"));
        }
    }

    /* ---------- ticket Z ---------- */

    /**
     * Ticket Z, a partir des lignes de l'ancien : pour chaque caissier, le detail par moyen comme avant (libelles
     * inchanges), ses especes en tiroir encadrees ; puis le total de l'officine (lignes terminees par « ;G ») et les
     * signatures.
     */
    private void ticketZ() {
        doc.bloc(TicketDocument.TITRE).texte(s.titre.replaceAll("\\s+", " ").trim(), Style.GRAND);
        Bloc corps = doc.bloc(TicketDocument.CORPS);
        Bloc totaux = doc.bloc(TicketDocument.TOTAUX);
        boolean premier = true;
        for (String l : s.datas) {
            String[] p = l.split(";", -1);
            String libelle = p[0].trim().replaceAll("\\s*:$", "").trim();
            String valeur = p.length > 1 ? p[1].trim() : "";
            boolean pied = p.length > 6 && "G".equals(p[6].trim());
            if (libelle.isEmpty()) {
                continue;
            }
            if (libelle.startsWith("RECAPITULATIF DE CAISSE")) {
                if (!premier) {
                    corps.trait(false);
                }
                premier = false;
                corps.texte("CAISSIER : " + coupe(libelle)[1], Style.GRAS);
            } else if (pied) {
                if (totaux.vide()) {
                    totaux.trait(true);
                    totaux.texte("TOTAL OFFICINE", Style.GRAS);
                }
                if (libelle.equals("TOTAL ESP")) {
                    doc.bloc(TicketDocument.NET).encadre("TOTAL ESPÈCES", montantF(valeur), Style.GRAND);
                } else {
                    totaux.paire(libelle, montantF(valeur), Style.NORMAL);
                }
            } else if (libelle.equals("Total espèce")) {
                corps.encadre("Espèces en tiroir", montantF(valeur), Style.GRAS);
            } else {
                corps.paire(libelle, montantF(valeur),
                        p.length > 4 && "1".equals(p[4].trim()) ? Style.GRAS : Style.NORMAL);
            }
        }
        if (r.signatures()) {
            doc.bloc(TicketDocument.SIGNATURES).signatures(Arrays.asList("Caissier", "Responsable"));
        }
    }

    /* ---------- reglements ---------- */

    private void reglement() {
        String nature = s.ticket == ModeleTicket.REGLEMENT_FACTURE ? "FACTURE"
                : s.ticket == ModeleTicket.REGLEMENT_CARNET_DEPOT ? "CARNET / DÉPÔT" : "DIFFÉRÉ";
        doc.bloc(TicketDocument.TITRE).texte("REÇU DE RÈGLEMENT · " + nature, Style.GRAND);
        for (String l : s.infoTiersPayants) {
            String[] lv = coupe(l);
            if (!lv[1].isEmpty()) {
                doc.bloc(TicketDocument.INTERVENANTS).texte(lv[0] + " : " + lv[1], Style.PETIT);
            }
        }
        for (String l : s.infoSellers) {
            doc.bloc(TicketDocument.INTERVENANTS).texte(libelleValeur(l, "Caisse"), Style.PETIT);
        }
        Bloc corps = doc.bloc(TicketDocument.CORPS);
        corps.trait(false);
        for (String[] piece : s.pieces) {
            corps.paire(piece[0], montant(piece[1]), Style.NORMAL);
        }
        String nombre = "";
        String verse = "";
        String reste = "";
        for (String l : s.datas) {
            String[] p = l.split(";", -1);
            if (p.length >= 3 && p[0].trim().matches("\\d+")) {
                nombre = p[0].trim();
                verse = p[1].replace("F CFA", "").trim();
                reste = p[2].replace("F CFA", "").trim();
            }
        }
        if (!s.pieces.isEmpty()) {
            corps.trait(false);
        }
        String du = "";
        String mode = "";
        Bloc reglement = doc.bloc(TicketDocument.REGLEMENT);
        for (String l : s.subtotal) {
            String[] p = l.split(";", -1);
            String libelle = p[0].replace(":", "").trim();
            String valeur = p.length > 1 ? p[1].trim() : "";
            if (libelle.startsWith("Net à payer")) {
                du = valeur;
            } else if (libelle.equals("Règlement")) {
                mode = valeur;
            } else if (libelle.startsWith("Montant Versé")) {
                reglement.paire(estEspeces(mode) ? "Espèces versées" : mode.isEmpty() ? "Montant versé" : mode,
                        montantF(valeur), Style.NORMAL);
            } else if (libelle.startsWith("Monnaie") && entier(valeur) > 0) {
                reglement.paire("Monnaie rendue", montantF(valeur), Style.NORMAL);
            }
        }
        String quoi = s.ticket == ModeleTicket.REGLEMENT_FACTURE ? "facture" : "dossier";
        int n = entier(nombre);
        if (!vide(du)) {
            doc.bloc(TicketDocument.TOTAUX).paire(
                    "Montant dû" + (n > 0 ? " (" + n + " " + quoi + (n > 1 ? "s" : "") + ")" : ""), montantF(du),
                    Style.NORMAL);
        }
        if (!vide(verse)) {
            doc.bloc(TicketDocument.NET).encadre("RÉGLÉ", montant(verse) + " F CFA", Style.GRAND);
        }
        if (!vide(reste)) {
            reglement.paire("Reste dû", montantF(reste), Style.GRAS);
        }
    }

    /* ---------- pied ---------- */

    private void pied() {
        String date = "";
        if (s.operation != null) {
            date = new SimpleDateFormat(court ? "dd/MM/yy HH:mm" : "dd/MM/yyyy HH:mm").format(s.operation);
        }
        if (s.ticket == ModeleTicket.PREVENTE) {
            doc.bloc(TicketDocument.PIED).pied(s.imageCode, "Présentez ce ticket à la caisse", date, true);
            return;
        }
        if (s.ticket == ModeleTicket.TICKET_Z) {
            doc.bloc(TicketDocument.PIED).trait(false);
            doc.bloc(TicketDocument.PIED).texte("Édité le " + date, Style.PETIT);
            return;
        }
        doc.bloc(TicketDocument.PIED).trait(false);
        doc.bloc(TicketDocument.PIED).pied(s.imageCode, s.referencePied, date, false);
    }

    /* ---------- outils ---------- */

    /** « libelle:: valeur » en deux parties ; sans « :: », le premier « : ». */
    static String[] coupe(String l) {
        String t = l == null ? "" : l;
        int i = t.indexOf("::");
        int k = 2;
        if (i < 0) {
            i = t.indexOf(':');
            k = 1;
        }
        if (i < 0) {
            return new String[] { t.trim(), "" };
        }
        return new String[] { t.substring(0, i).replaceAll("\\s+", " ").trim(), t.substring(i + k).trim() };
    }

    /** Montant de l'ancien ticket (« 2.410 », « (-) 260 », « 990 CFA ») en « 2 410 ». */
    static String montant(String v) {
        if (v == null) {
            return "";
        }
        String t = v.replace("(-)", "").replace("F CFA", "").replace("CFA", "").replace(' ', ' ').trim();
        if (t.matches("-?\\d{1,15}")) {
            return nombre(Long.parseLong(t));
        }
        if (t.matches("-?[\\d .]+")) {
            return t.replaceAll("(\\d)[. ](?=\\d{3}(\\D|$))", "$1 ").replaceAll("\\s+", " ").trim();
        }
        return t;
    }

    /** Montant suivi de l'unite : « F CFA », ou « F » sur un rouleau de 58 mm. */
    private String montantF(String v) {
        String m = montant(v);
        if (m.isEmpty() || !m.matches("-?[\\d ]+")) {
            return m;
        }
        return m + (court ? " F" : " F CFA");
    }

    static String nombre(long n) {
        String brut = String.valueOf(Math.abs(n));
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < brut.length(); i++) {
            if (i > 0 && (brut.length() - i) % 3 == 0) {
                b.append(' ');
            }
            b.append(brut.charAt(i));
        }
        return (n < 0 ? "-" : "") + b;
    }

    private static int entier(String v) {
        try {
            return Integer.parseInt(montant(v).replace(" ", ""));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static boolean estEspeces(String mode) {
        return mode != null && mode.trim().toLowerCase(Locale.FRENCH).startsWith("esp");
    }

    private static boolean vide(String v) {
        return v == null || v.trim().isEmpty();
    }

    private static String nul(String v) {
        return v == null ? "" : v;
    }
}
