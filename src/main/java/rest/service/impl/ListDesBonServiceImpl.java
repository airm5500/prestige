package rest.service.impl;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TemporalType;
import javax.persistence.Tuple;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.json.JSONObject;
import rest.service.ListDesBonService;

import rest.service.dto.BonsDTO;
import rest.service.dto.BonsParam;
import rest.service.dto.BonsTotauxDTO;
import util.DateCommonUtils;
import util.DateConverter;
import util.FunctionUtils;

/**
 *
 * @author koben
 */
@Stateless
public class ListDesBonServiceImpl implements ListDesBonService {

    private static final Logger LOG = Logger.getLogger(ListDesBonServiceImpl.class.getName());
    private static final String EXCLUDE_STATEMENT = " AND  p.`lg_PREENREGISTREMENT_ID` NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) ";
    private static final String QUERY = "SELECT  DATE_FORMAT(p.`dt_UPDATED`, \"%d/%m/%Y\") AS dtUPDATED,DATE_FORMAT(p.`dt_UPDATED`, \"%H:%i:%s\") AS HEURE, tp.lg_TIERS_PAYANT_ID AS tiersPayantId, tp.str_NAME AS libelleTiersPayant,typeTp.str_LIBELLE_TYPE_TIERS_PAYANT AS typeTiersPayant, \n"
            + " COALESCE(grp.str_LIBELLE, '') AS groupeLibelle, \n"
            + " cp.int_PRICE AS cpAmount , p.`str_REF`, cp.`int_PERCENT`,cp.`int_PRICE_RESTE`, p.`int_PRICE_REMISE`\n"
            + "  ,cp.lg_PREENREGISTREMENT_ID AS lg_PREENREGISTREMENT_ID ,"
            + " CASE WHEN p.`lg_AYANTS_DROITS_ID` IS NOT NULL THEN COALESCE(ayd.`str_FIRST_NAME`, p.`str_FIRST_NAME_CUSTOMER`) ELSE COALESCE(clt.`str_FIRST_NAME`, p.`str_FIRST_NAME_CUSTOMER`) END AS str_FIRST_NAME_CUSTOMER,"
            + " CASE WHEN p.`lg_AYANTS_DROITS_ID` IS NOT NULL THEN COALESCE(ayd.`str_LAST_NAME`, p.`str_LAST_NAME_CUSTOMER`) ELSE COALESCE(clt.`str_LAST_NAME`, p.`str_LAST_NAME_CUSTOMER`) END AS str_LAST_NAME_CUSTOMER,"
            + " clt.`str_FIRST_NAME`,clt.`str_LAST_NAME`,cl.`str_NUMERO_SECURITE_SOCIAL`,cp.`str_REF_BON`\n"
            + "FROM  t_preenregistrement_compte_client_tiers_payent cp,\n"
            + "t_compte_client_tiers_payant cl, t_tiers_payant tp LEFT JOIN t_groupe_tierspayant grp ON grp.lg_GROUPE_ID = tp.lg_GROUPE_ID,\n"
            + " t_compte_client cpt,t_type_tiers_payant typeTp, t_client clt, mvttransaction m,"
            + " t_preenregistrement p LEFT JOIN t_ayant_droit ayd ON ayd.`lg_AYANTS_DROITS_ID` = p.`lg_AYANTS_DROITS_ID`\n"
            + " WHERE cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID\n"
            + " AND cl.lg_TIERS_PAYANT_ID=tp.lg_TIERS_PAYANT_ID AND\n"
            + " cl.lg_COMPTE_CLIENT_ID=cpt.lg_COMPTE_CLIENT_ID \n"
            + "AND tp.lg_TYPE_TIERS_PAYANT_ID=typeTp.`lg_TYPE_TIERS_PAYANT_ID` AND cpt.`lg_CLIENT_ID`=clt.`lg_CLIENT_ID`\n"
            + "AND p.`lg_PREENREGISTREMENT_ID`=cp.`lg_PREENREGISTREMENT_ID` AND m.pkey=p.`lg_PREENREGISTREMENT_ID` AND p.`dt_UPDATED` >= ?1 AND p.`dt_UPDATED` <= ?2  AND m.`typeTransaction`=1 AND m.pkey=p.`lg_PREENREGISTREMENT_ID` AND p.`str_STATUT`='is_Closed' AND p.`lg_TYPE_VENTE_ID` <> ?3 AND m.`lg_EMPLACEMENT_ID` =?4 "
            + " AND p.imported=0 AND p.`b_IS_CANCEL`=0 AND p.`int_PRICE` >0 {excludeStatement} {search} {tierspayantId} {typeTp} {groupeTp} ORDER BY  libelleTiersPayant,p.`dt_UPDATED`  ";

    private static final String RAPPORT_SQL_LIKE = " AND (cp.`str_REF_BON` LIKE '%s' OR cl.`str_NUMERO_SECURITE_SOCIAL` LIKE '%s' OR tp.str_NAME LIKE '%s' OR clt.`str_FIRST_NAME` LIKE '%s' OR clt.`str_FIRST_NAME` LIKE '%s') ";
    private static final String TIERS_PAYANT_ID = " AND tp.`lg_TIERS_PAYANT_ID`= %s ";
    private static final String TYPE_TIERS_PAYANT_ID = " AND tp.`lg_TYPE_TIERS_PAYANT_ID`= '%s' ";
    private static final String GROUPE_TIERS_PAYANT_ID = " AND tp.`lg_GROUPE_ID`= %s ";

    private static final String QUERY_TOTAUX = "SELECT  COUNT(cp.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`)  AS nbreBon, SUM(cp.`int_PRICE`) AS montant "
            + " FROM  t_preenregistrement_compte_client_tiers_payent cp,\n"
            + " t_compte_client_tiers_payant cl, t_tiers_payant tp LEFT JOIN t_groupe_tierspayant grp ON grp.lg_GROUPE_ID = tp.lg_GROUPE_ID,\n"
            + " t_compte_client cpt,t_type_tiers_payant typeTp, t_client clt, t_preenregistrement p,mvttransaction m\n"
            + " WHERE cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID\n"
            + " AND cl.lg_TIERS_PAYANT_ID=tp.lg_TIERS_PAYANT_ID AND\n"
            + " cl.lg_COMPTE_CLIENT_ID=cpt.lg_COMPTE_CLIENT_ID \n"
            + "AND tp.lg_TYPE_TIERS_PAYANT_ID=typeTp.`lg_TYPE_TIERS_PAYANT_ID` AND cpt.`lg_CLIENT_ID`=clt.`lg_CLIENT_ID`\n"
            + "AND p.`lg_PREENREGISTREMENT_ID`=cp.`lg_PREENREGISTREMENT_ID` AND m.pkey=p.`lg_PREENREGISTREMENT_ID` AND p.`dt_UPDATED` >= ?1 AND p.`dt_UPDATED` <= ?2  AND m.`typeTransaction`=1 AND m.pkey=p.`lg_PREENREGISTREMENT_ID` AND p.`str_STATUT`='is_Closed' AND p.`lg_TYPE_VENTE_ID` <> ?3 AND m.`lg_EMPLACEMENT_ID` =?4 "
            + " AND p.imported=0 AND p.`b_IS_CANCEL`=0 AND p.`int_PRICE` >0 {excludeStatement} {search} {tierspayantId} {typeTp} {groupeTp} ";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public List<BonsDTO> listAllBons(BonsParam bonsParam) {
        return listBonsList(bonsParam).stream().map(this::build).collect(Collectors.toList());
    }

    @Override
    public JSONObject listBons(BonsParam bonsParam) {
        BonsTotauxDTO bonsTotaux = listBonsTotaux(bonsParam);
        return FunctionUtils.returnData(listAllBons(bonsParam), bonsTotaux.getNbreBon(), bonsTotaux);
    }

    @Override
    public BonsTotauxDTO listBonsTotaux(BonsParam bonsParam) {
        Pair<LocalDateTime, LocalDateTime> dateParams = buildDateParams(bonsParam);
        String sql = replacePlaceHolder(QUERY_TOTAUX, bonsParam);
        LOG.log(Level.INFO, "sql--- listAllBons {0}", sql);
        try {
            // TIMESTAMP (et non DATE) : les bornes gardent leurs heures. Avec DATE, la borne de fin
            // etait tronquee a minuit (les bons du dernier jour etaient exclus) et les champs
            // heure debut/fin de l'ecran etaient ignores.
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(3, DateConverter.DEPOT_EXTENSION)
                    .setParameter(4, bonsParam.getEmplacementId())
                    .setParameter(1, DateCommonUtils.convertLocalDateTimeToDate(dateParams.getLeft()),
                            TemporalType.TIMESTAMP)
                    .setParameter(2, DateCommonUtils.convertLocalDateTimeToDate(dateParams.getRight()),
                            TemporalType.TIMESTAMP);

            return Optional.ofNullable((Tuple) query.getSingleResult()).map(this::buildBonsTotaux)
                    .orElse(BonsTotauxDTO.builder().build());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return BonsTotauxDTO.builder().build();
        }

    }

    private String replacePlaceHolder(String sql, BonsParam bonsParam) {
        String search = bonsParam.getSearch();
        String tiersPayantId = bonsParam.getTiersPayantId();
        if (bonsParam.isShowAllAmount()) {
            sql = sql.replace("{excludeStatement}", "");

        } else {
            sql = sql.replace("{excludeStatement}", EXCLUDE_STATEMENT);
        }
        if (StringUtils.isNotEmpty(search)) {

            sql = sql.replace("{search}", String.format(RAPPORT_SQL_LIKE, search + "%", search + "%", search + "%",
                    search + "%", search + "%"));
        } else {
            sql = sql.replace("{search}", "");
        }
        if (StringUtils.isNotEmpty(tiersPayantId)) {

            sql = sql.replace("{tierspayantId}", String.format(TIERS_PAYANT_ID, tiersPayantId));
        } else {
            sql = sql.replace("{tierspayantId}", "");
        }
        // Filtres lot 3 : type de tiers payant et groupe de tiers payant. Les valeurs ne sont
        // acceptees que numeriques (identifiants techniques) pour rester inoffensives dans le SQL.
        if (StringUtils.isNotEmpty(bonsParam.getTypeTiersPayantId())
                && StringUtils.isNumeric(bonsParam.getTypeTiersPayantId())) {
            sql = sql.replace("{typeTp}", String.format(TYPE_TIERS_PAYANT_ID, bonsParam.getTypeTiersPayantId()));
        } else {
            sql = sql.replace("{typeTp}", "");
        }
        if (StringUtils.isNotEmpty(bonsParam.getGroupeId()) && StringUtils.isNumeric(bonsParam.getGroupeId())) {
            sql = sql.replace("{groupeTp}", String.format(GROUPE_TIERS_PAYANT_ID, bonsParam.getGroupeId()));
        } else {
            sql = sql.replace("{groupeTp}", "");
        }
        return sql;
    }

    private List<Tuple> listBonsList(BonsParam bonsParam) {
        Pair<LocalDateTime, LocalDateTime> dateParams = buildDateParams(bonsParam);
        String sql = replacePlaceHolder(QUERY, bonsParam);
        LOG.log(Level.INFO, "sql--- listAllBons {0}", sql);
        try {
            // TIMESTAMP : memes bornes exactes que la requete des totaux (heures respectees)
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(3, DateConverter.DEPOT_EXTENSION)
                    .setParameter(4, bonsParam.getEmplacementId())
                    .setParameter(1, DateCommonUtils.convertLocalDateTimeToDate(dateParams.getLeft()),
                            TemporalType.TIMESTAMP)
                    .setParameter(2, DateCommonUtils.convertLocalDateTimeToDate(dateParams.getRight()),
                            TemporalType.TIMESTAMP);
            if (!bonsParam.isAll()) {
                query.setFirstResult(bonsParam.getStart());
                query.setMaxResults(bonsParam.getLimit());
            }
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private BonsDTO build(Tuple tuple) {
        return BonsDTO.builder().dtUPDATED(tuple.get("dtUPDATED", String.class)).heure(tuple.get("HEURE", String.class))
                .tiersPayantId(tuple.get("tiersPayantId", String.class))
                .clientFullName(
                        tuple.get("str_FIRST_NAME", String.class) + " " + tuple.get("str_LAST_NAME", String.class))
                .beneficiaireFullName(tuple.get("str_FIRST_NAME_CUSTOMER", String.class) + " "
                        + tuple.get("str_LAST_NAME_CUSTOMER", String.class))
                .strNUMEROSECURITESOCIAL(tuple.get("str_NUMERO_SECURITE_SOCIAL", String.class))
                .strREFBON(tuple.get("str_REF_BON", String.class)).strREF(tuple.get("str_REF", String.class))
                .tiersPayantLibelle(tuple.get("libelleTiersPayant", String.class))
                .intPERCENT(tuple.get("int_PERCENT", Integer.class)).intPRICE(tuple.get("cpAmount", Integer.class))
                .lg_PREENREGISTREMENT_ID(tuple.get("lg_PREENREGISTREMENT_ID", String.class))
                .typeTiersPayant(tuple.get("typeTiersPayant", String.class))
                .groupeLibelle(tuple.get("groupeLibelle", String.class)).build();
    }

    private BonsTotauxDTO buildBonsTotaux(Tuple tuple) {
        return BonsTotauxDTO.builder().nbreBon(tuple.get("nbreBon", BigInteger.class).intValue())
                .montant(tuple.get("montant", BigDecimal.class)).build();
    }

    // ------------------------------------------------------------------
    // PDF construit en code (lot 3) : liste simple regroupee par groupe, ou
    // liste avec les produits de chaque bon. Aucun gabarit jasper requis,
    // donc rien a deployer dans le dossier CONF des officines.
    // ------------------------------------------------------------------
    @Override
    public byte[] buildBonsPdf(BonsParam bonsParam, boolean avecProduits, boolean parGroupe, String entete,
            String periode, String imprimePar) {
        List<BonsDTO> bons = listAllBons(bonsParam);
        Map<String, List<String[]>> produitsParVente = avecProduits
                ? produitsParVente(bons.stream().map(BonsDTO::getLg_PREENREGISTREMENT_ID).collect(Collectors.toList()))
                : java.util.Collections.emptyMap();

        com.lowagie.text.Document document = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4, 24, 24, 24,
                24);
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        try {
            com.lowagie.text.pdf.PdfWriter.getInstance(document, baos);
            document.open();

            com.lowagie.text.Font titre = com.lowagie.text.FontFactory
                    .getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 12);
            com.lowagie.text.Font sousTitre = com.lowagie.text.FontFactory
                    .getFont(com.lowagie.text.FontFactory.HELVETICA, 9);
            com.lowagie.text.Font groupeFont = com.lowagie.text.FontFactory
                    .getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 10, java.awt.Color.WHITE);
            com.lowagie.text.Font tpFont = com.lowagie.text.FontFactory
                    .getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 9);
            com.lowagie.text.Font headFont = com.lowagie.text.FontFactory
                    .getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 7.5f);
            com.lowagie.text.Font cellFont = com.lowagie.text.FontFactory
                    .getFont(com.lowagie.text.FontFactory.HELVETICA, 7.5f);
            com.lowagie.text.Font produitFont = com.lowagie.text.FontFactory
                    .getFont(com.lowagie.text.FontFactory.HELVETICA, 7f, java.awt.Color.DARK_GRAY);

            com.lowagie.text.Paragraph pTitre = new com.lowagie.text.Paragraph(entete, titre);
            document.add(pTitre);
            document.add(new com.lowagie.text.Paragraph(
                    (avecProduits ? "LISTE DES BONS AVEC PRODUITS" : "LISTE DES BONS") + " - " + periode, sousTitre));
            document.add(new com.lowagie.text.Paragraph("Imprimé par : " + imprimePar, sousTitre));
            document.add(com.lowagie.text.Chunk.NEWLINE);

            // Regroupement : groupe -> tiers payant -> bons (ordre alphabetique stable)
            Map<String, Map<String, List<BonsDTO>>> arbre = new java.util.TreeMap<>();
            for (BonsDTO bon : bons) {
                String groupe = parGroupe
                        ? (StringUtils.isNotEmpty(bon.getGroupeLibelle()) ? bon.getGroupeLibelle() : "SANS GROUPE")
                        : "";
                arbre.computeIfAbsent(groupe, k -> new java.util.TreeMap<>())
                        .computeIfAbsent(bon.getTiersPayantLibelle() == null ? "" : bon.getTiersPayantLibelle(),
                                k -> new ArrayList<>())
                        .add(bon);
            }

            long totalGeneral = 0;
            int nbreBonsGeneral = 0;
            for (Map.Entry<String, Map<String, List<BonsDTO>>> groupeEntry : arbre.entrySet()) {
                long totalGroupe = 0;
                int nbreBonsGroupe = 0;
                if (parGroupe) {
                    com.lowagie.text.pdf.PdfPTable bandeau = new com.lowagie.text.pdf.PdfPTable(1);
                    bandeau.setWidthPercentage(100);
                    com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(
                            new com.lowagie.text.Phrase("GROUPE : " + groupeEntry.getKey(), groupeFont));
                    cell.setBackgroundColor(new java.awt.Color(52, 73, 94));
                    cell.setPadding(4f);
                    bandeau.addCell(cell);
                    bandeau.setSpacingBefore(6f);
                    document.add(bandeau);
                }
                for (Map.Entry<String, List<BonsDTO>> tpEntry : groupeEntry.getValue().entrySet()) {
                    document.add(new com.lowagie.text.Paragraph(tpEntry.getKey(), tpFont));

                    com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(7);
                    table.setWidthPercentage(100);
                    table.setWidths(new float[] { 8f, 6f, 8f, 14f, 14f, 7f, 3f });
                    table.setSpacingBefore(2f);
                    table.setHeaderRows(1);
                    for (String h : new String[] { "Date et heure", "Ticket", "N° bon", "Assuré principal",
                            "Bénéficiaire", "Matricule", "%" }) {
                        com.lowagie.text.pdf.PdfPCell hc = new com.lowagie.text.pdf.PdfPCell(
                                new com.lowagie.text.Phrase(h, headFont));
                        hc.setGrayFill(0.88f);
                        table.addCell(hc);
                    }
                    long totalTp = 0;
                    for (BonsDTO bon : tpEntry.getValue()) {
                        table.addCell(new com.lowagie.text.pdf.PdfPCell(
                                new com.lowagie.text.Phrase(bon.getDateHeure(), cellFont)));
                        table.addCell(new com.lowagie.text.pdf.PdfPCell(
                                new com.lowagie.text.Phrase(nz(bon.getStrREF()), cellFont)));
                        table.addCell(new com.lowagie.text.pdf.PdfPCell(
                                new com.lowagie.text.Phrase(nz(bon.getStrREFBON()), cellFont)));
                        table.addCell(new com.lowagie.text.pdf.PdfPCell(
                                new com.lowagie.text.Phrase(nz(bon.getClientFullName()), cellFont)));
                        table.addCell(new com.lowagie.text.pdf.PdfPCell(
                                new com.lowagie.text.Phrase(nz(bon.getBeneficiaireFullName()), cellFont)));
                        table.addCell(new com.lowagie.text.pdf.PdfPCell(
                                new com.lowagie.text.Phrase(nz(bon.getStrNUMEROSECURITESOCIAL()), cellFont)));
                        com.lowagie.text.pdf.PdfPCell pc = new com.lowagie.text.pdf.PdfPCell(
                                new com.lowagie.text.Phrase(String.valueOf(bon.getIntPERCENT()), cellFont));
                        pc.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_RIGHT);
                        table.addCell(pc);
                        // montant attendu du bon, sur une ligne dediee alignee a droite
                        com.lowagie.text.pdf.PdfPCell mc = new com.lowagie.text.pdf.PdfPCell(
                                new com.lowagie.text.Phrase("Montant attendu : " + formatMontant(bon.getIntPRICE()),
                                        cellFont));
                        mc.setColspan(7);
                        mc.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_RIGHT);
                        mc.setBorder(com.lowagie.text.Rectangle.BOTTOM);
                        table.addCell(mc);
                        totalTp += bon.getIntPRICE();
                        if (avecProduits) {
                            List<String[]> produits = produitsParVente.getOrDefault(bon.getLg_PREENREGISTREMENT_ID(),
                                    java.util.Collections.emptyList());
                            for (String[] p : produits) {
                                com.lowagie.text.pdf.PdfPCell vide = new com.lowagie.text.pdf.PdfPCell(
                                        new com.lowagie.text.Phrase("", produitFont));
                                vide.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
                                table.addCell(vide);
                                com.lowagie.text.pdf.PdfPCell lib = new com.lowagie.text.pdf.PdfPCell(
                                        new com.lowagie.text.Phrase(p[0] + "  " + p[1], produitFont));
                                lib.setColspan(4);
                                lib.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
                                table.addCell(lib);
                                com.lowagie.text.pdf.PdfPCell qte = new com.lowagie.text.pdf.PdfPCell(
                                        new com.lowagie.text.Phrase("x " + p[2], produitFont));
                                qte.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
                                qte.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_RIGHT);
                                table.addCell(qte);
                                com.lowagie.text.pdf.PdfPCell mt = new com.lowagie.text.pdf.PdfPCell(
                                        new com.lowagie.text.Phrase(formatMontant(Integer.parseInt(p[3])),
                                                produitFont));
                                mt.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
                                mt.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_RIGHT);
                                table.addCell(mt);
                            }
                        }
                    }
                    // total du tiers payant
                    com.lowagie.text.pdf.PdfPCell tot = new com.lowagie.text.pdf.PdfPCell(
                            new com.lowagie.text.Phrase("TOTAL " + tpEntry.getKey() + " (" + tpEntry.getValue().size()
                                    + " bon(s)) : " + formatMontant(totalTp), tpFont));
                    tot.setColspan(7);
                    tot.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_RIGHT);
                    tot.setGrayFill(0.95f);
                    table.addCell(tot);
                    document.add(table);
                    totalGroupe += totalTp;
                    nbreBonsGroupe += tpEntry.getValue().size();
                }
                if (parGroupe) {
                    com.lowagie.text.Paragraph pGroupe = new com.lowagie.text.Paragraph("TOTAL GROUPE "
                            + groupeEntry.getKey() + " (" + nbreBonsGroupe + " bon(s)) : " + formatMontant(totalGroupe),
                            tpFont);
                    pGroupe.setSpacingAfter(4f);
                    document.add(pGroupe);
                }
                totalGeneral += totalGroupe;
                nbreBonsGeneral += nbreBonsGroupe;
            }
            com.lowagie.text.Paragraph pTotal = new com.lowagie.text.Paragraph(
                    "TOTAL GENERAL (" + nbreBonsGeneral + " bon(s)) : " + formatMontant(totalGeneral), titre);
            pTotal.setSpacingBefore(6f);
            document.add(pTotal);
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Construction du PDF liste des bons impossible", e);
            if (document.isOpen()) {
                document.close();
            }
            return new byte[0];
        }
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private static String formatMontant(long montant) {
        return String.format("%,d", montant).replace(',', ' ') + " F";
    }

    /** Produits (cip, libelle, quantite, montant) de chaque vente, en une seule requete par lot d'identifiants. */
    private Map<String, List<String[]>> produitsParVente(List<String> venteIds) {
        Map<String, List<String[]>> map = new java.util.HashMap<>();
        if (venteIds == null || venteIds.isEmpty()) {
            return map;
        }
        final int CHUNK = 500;
        for (int i = 0; i < venteIds.size(); i += CHUNK) {
            List<String> chunk = venteIds.subList(i, Math.min(venteIds.size(), i + CHUNK));
            try {
                @SuppressWarnings("unchecked")
                List<Object[]> rows = em.createNativeQuery(
                        "SELECT d.lg_PREENREGISTREMENT_ID, f.int_CIP, f.str_NAME, d.int_QUANTITY, d.int_PRICE"
                                + " FROM t_preenregistrement_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                                + " WHERE d.lg_PREENREGISTREMENT_ID IN (:ids) ORDER BY f.str_NAME")
                        .setParameter("ids", chunk).getResultList();
                for (Object[] r : rows) {
                    map.computeIfAbsent((String) r[0], k -> new ArrayList<>())
                            .add(new String[] { r[1] == null ? "" : r[1].toString(),
                                    r[2] == null ? "" : r[2].toString(),
                                    r[3] == null ? "0" : String.valueOf(((Number) r[3]).intValue()),
                                    r[4] == null ? "0" : String.valueOf(((Number) r[4]).intValue()) });
                }
            } catch (Exception e) {
                LOG.log(Level.WARNING, "Lecture des produits des bons impossible", e);
            }
        }
        return map;
    }

    private Pair<LocalDateTime, LocalDateTime> buildDateParams(BonsParam bonsParam) {
        LocalDate dts = StringUtils.isNotEmpty(bonsParam.getDtStart()) ? LocalDate.parse(bonsParam.getDtStart())
                : LocalDate.now();
        LocalTime hs = StringUtils.isNotEmpty(bonsParam.getHStart())
                ? LocalTime.parse(bonsParam.getHStart(), DateTimeFormatter.ofPattern("HH:mm")) : LocalTime.MIN;
        LocalDateTime dtStart = dts.atTime(hs);

        LocalDate dtE = StringUtils.isNotEmpty(bonsParam.getDtEnd()) ? LocalDate.parse(bonsParam.getDtEnd())
                : LocalDate.now();
        LocalTime hE = StringUtils.isNotEmpty(bonsParam.getHEnd())
                ? LocalTime.parse(bonsParam.getHEnd(), DateTimeFormatter.ofPattern("HH:mm")) : LocalTime.MAX;
        LocalDateTime dtEnd = dtE.atTime(hE);
        return Pair.of(dtStart, dtEnd);
    }

}
