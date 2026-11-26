package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.dto.ModeReglementTDO;
import util.FunctionUtils;

/**
 * Journal support du 26/11, capitale (J26-7) : `GET modereglement/all` depassait 5 s. La liste chargeait chaque QR code
 * (MEDIUMBLOB) et le rendait en tableau de nombres : 5,7 Mo de JSON sur la copie locale pour 9 modes. La liste est
 * maintenant construite sans les octets ({@link ModeReglementServiceImpl#liste}) ; l'image a sa propre adresse.
 * <p>
 * Regles verifiees sur 5 000 jeux tires au hasard (graine fixe) : modes 3, 4 et 6 ecartes et eux seuls ; tri sur le nom
 * du mode ; libelle, type, mobile money, client requis et client par defaut repris de la ligne ; une adresse d'image si
 * et seulement si le QR code a une taille, avec l'identifiant et la taille ; aucun octet d'image ; JSON borne (moins de
 * 400 octets par mode).
 */
class ModeReglementListeCoherenceTest {

    @Test
    void capitaleNeufModes() {
        List<Object[]> lignes = new ArrayList<>();
        lignes.add(ligne("1", "Especes", "1", "Especes", 0, null, 0));
        lignes.add(ligne("10", "Wave", "10", "Wave", 1, "C10", 781_098));
        lignes.add(ligne("11", "Moov Money", "11", "Moov Money", 1, "C11", 496_410));
        lignes.add(ligne("3", "Differe", "3", "Differe", 0, null, 0));
        lignes.add(ligne("9", "Orange Money", "9", "Orange Money", 1, "C9", 277_411));
        List<ModeReglementTDO> l = ModeReglementServiceImpl.liste(lignes);
        assertEquals(4, l.size());
        assertEquals("../api/v1/modereglement/10/qrcode?v=781098", parId(l).get("10").getQrCodeUrl());
        assertNull(parId(l).get("1").getQrCodeUrl());
        String json = FunctionUtils.returnData(l).toString();
        assertTrue(json.length() < 2_000, json.length() + " octets");
        assertTrue(!json.contains("\"qrCode\":["), json);
    }

    @Test
    void jeuxAuHasard() {
        Random r = new Random(20261126L);
        String[] noms = { "Especes", "Cheques", "Wave", "Orange Money", "MTN", "Moov", "Carte", "Virement", null };
        for (int cas = 0; cas < 5_000; cas++) {
            List<Object[]> lignes = new ArrayList<>();
            int n = r.nextInt(16);
            for (int i = 0; i < n; i++) {
                String id = r.nextInt(5) == 0 ? String.valueOf(3 + r.nextInt(4)) : String.valueOf(1 + r.nextInt(90));
                Object requis = r.nextBoolean() ? (Object) Boolean.valueOf(r.nextBoolean()) : (Object) r.nextInt(2);
                long taille = r.nextInt(3) == 0 ? 0 : 1 + r.nextInt(800_000);
                lignes.add(new Object[] { id, noms[r.nextInt(noms.length - 1)] + (r.nextBoolean() ? "" : " " + i),
                        String.valueOf(r.nextInt(12)), noms[r.nextInt(noms.length)], r.nextInt(6) == 0 ? null : requis,
                        r.nextInt(3) == 0 ? null : (r.nextBoolean() ? " " : "C" + i), r.nextInt(8) == 0 ? null
                                : (Object) (r.nextBoolean() ? Long.valueOf(taille) : Integer.valueOf((int) taille)) });
            }
            List<ModeReglementTDO> l = ModeReglementServiceImpl.liste(lignes);
            long attendus = lignes.stream().filter(x -> !ModeReglementServiceImpl.MODES_ECARTES.contains(x[0])).count();
            assertEquals(attendus, l.size(), "cas " + cas);
            // attendu : lignes gardees, triees sur le nom du mode (tri stable : a nom egal, l'ordre d'arrivee)
            List<Object[]> gardees = new ArrayList<>();
            for (Object[] x : lignes) {
                if (!ModeReglementServiceImpl.MODES_ECARTES.contains(x[0])) {
                    gardees.add(x);
                }
            }
            gardees.sort(java.util.Comparator.comparing((Object[] x) -> String.valueOf(x[1])));
            String precedent = null;
            for (int k = 0; k < l.size(); k++) {
                ModeReglementTDO m = l.get(k);
                Object[] x = gardees.get(k);
                assertTrue(!ModeReglementServiceImpl.MODES_ECARTES.contains(m.getId()), "cas " + cas);
                assertEquals(x[0], m.getId(), "cas " + cas + " : ligne " + k);
                assertEquals(x[2], m.getTypeReglementId(), "cas " + cas);
                assertEquals(x[3], m.getName(), "cas " + cas);
                String nom = String.valueOf(x[1]);
                assertTrue(precedent == null || precedent.compareTo(nom) <= 0, "cas " + cas + " : tri");
                precedent = nom;
                assertEquals(util.MobileMoney.est((String) x[2]), m.isMobileMoney());
                boolean requis = x[4] instanceof Boolean ? (Boolean) x[4]
                        : x[4] instanceof Integer && (Integer) x[4] != 0;
                assertEquals(requis, m.isClientRequis(), "cas " + cas);
                String client = x[5] == null ? "" : ((String) x[5]).trim();
                assertEquals(client.isEmpty() ? null : client, m.getClientDefautId(), "cas " + cas);
                long taille = x[6] == null ? 0 : ((Number) x[6]).longValue();
                assertEquals(taille > 0 ? "../api/v1/modereglement/" + m.getId() + "/qrcode?v=" + taille : null,
                        m.getQrCodeUrl(), "cas " + cas);
                assertNull(m.getQrCode(), "aucun octet d'image");
            }
            String json = FunctionUtils.returnData(l).toString();
            assertTrue(json.length() < 100 + 400L * Math.max(1, l.size()), "cas " + cas + " : " + json.length());
            assertTrue(!json.contains("\"qrCode\":["), "cas " + cas);
            JSONObject o = new JSONObject(json);
            assertEquals(l.size(), o.getInt("total"));
        }
    }

    private static Object[] ligne(String id, String nomMode, String type, String nomType, int requis, String client,
            long taille) {
        return new Object[] { id, nomMode, type, nomType, requis, client, taille };
    }

    private static Map<String, ModeReglementTDO> parId(List<ModeReglementTDO> l) {
        Map<String, ModeReglementTDO> m = new HashMap<>();
        l.forEach(x -> m.put(x.getId(), x));
        return m;
    }
}
