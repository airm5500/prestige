import csv, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.utils import get_column_letter

MENUS = sys.argv[1]; SORTIE = sys.argv[2]
F = 'Arial'
def f(**k): return Font(name=F, **k)

# ---------------------------------------------------------------- scenarios metier (fonctions livrees)
# (module, ecran, type, cas, prerequis, etapes, attendu, priorite)
S = []
def s(*a): S.append(a)

T = 'Transversal'
# Connexion et securite
s(T,'Page de connexion','Fonctionnel','Connexion par identifiant et mot de passe','Compte utilisateur actif','1. Ouvrir http://<serveur>:8080/prestige\n2. Saisir identifiant et mot de passe\n3. Entrée','L\'accueil s\'ouvre avec les menus du profil ; la connexion est notée au journal','Haute')
s(T,'Page de connexion','Sécurité','Mot de passe faux','Compte actif','1. Saisir un mauvais mot de passe 3 fois','Refus à chaque essai, message générique (sans dire si l\'identifiant existe) ; après plusieurs échecs, délai d\'attente imposé','Haute')
s(T,'Page de connexion','Fonctionnel','Connexion par badge QR','Employé rattaché à un utilisateur, badge actif imprimé en QR','1. Cliquer « Se connecter avec mon badge »\n2. Passer le QR devant la douchette','Session ouverte au nom de l\'employé, journal « par badge »','Haute')
s(T,'Page de connexion','Fonctionnel','Badge scanné dans le champ Identifiant','Badge QR valide','1. Cliquer dans « Identifiant »\n2. Scanner le badge','La lecture est reprise par la connexion par badge ; le contenu ne reste pas affiché ; session ouverte','Moyenne')
s(T,'Page de connexion','Fonctionnel','Douchette en clavier QWERTY sur poste AZERTY','Douchette réglée en anglais','1. Scanner le badge en mode badge','Connexion acceptée (lecture remise en ordre automatiquement)','Moyenne')
s(T,'Page de connexion','Ergonomie','Lecture de badge déformée','Douchette mal réglée ou Verr. Maj. actif','1. Scanner le badge','Message « Lecture du badge déformée » avec ce qui a été lu, secret masqué ; consigne Verr. Maj. si casse inversée','Moyenne')
s(T,'Page de connexion','Sécurité','Badge réimprimé après régénération','QR régénéré dans RH','1. Scanner l\'ancien exemplaire\n2. Scanner le nouveau','Ancien : « Badge non reconnu », aucune session ; nouveau : connexion','Haute')
s(T,'Page de connexion','Sécurité','Badge désactivé / expiré / employé inactif','Badge dans l\'un de ces états','1. Scanner le badge','« Badge non reconnu », aucune session ; raison notée dans server.log sans le secret','Haute')
s(T,'Page de connexion','Sécurité','Badge d\'un employé sans compte utilisateur','Employé non rattaché, badge imprimé en QR','1. Scanner le badge','« Badge sans compte utilisateur » avec la marche à suivre, aucune session','Moyenne')
s(T,'Session','Sécurité','Déconnexion','Session ouverte','1. GESTION DES UTILISATEURS > Deconnexion','Retour à la page de connexion ; un appel à une page protégée redemande la connexion','Haute')
s(T,'Droits','Sécurité','Menus selon le profil','Deux profils différents (caissier, admin)','1. Se connecter avec chaque profil','Chaque profil ne voit que les menus de ses droits ; une action interdite est refusée par le serveur','Haute')
s(T,'Journaux','Sécurité','Aucun secret dans les journaux','Après une série de tests','1. Ouvrir server.log et le Centre de support','Aucun mot de passe, jeton, secret de badge ni texte de message patient dans les traces','Haute')
s(T,'Toutes les fenêtres de modification','Ergonomie','Confirmation dans le bouton','Écran avec suppression/désactivation','1. Cliquer « Supprimer » ou « Désactiver »\n2. Cliquer de nouveau','1er clic : le bouton passe en « Confirmer… » sans fenêtre ; 2e clic : action faite ; sans 2e clic, le bouton revient seul','Haute')
s(T,'Toutes les fenêtres','Ergonomie','Double clic sur un bouton qui ouvre une fenêtre','—','1. Double-cliquer rapidement sur un bouton d\'ouverture','Une seule fenêtre s\'ouvre','Moyenne')
s(T,'Navigation','Ergonomie','Clavier : Entrée, Tab, Échap','Écran de saisie','1. Enchaîner la saisie au clavier','Entrée valide le champ / passe au suivant comme prévu ; Échap ferme une fenêtre sans rien changer','Moyenne')
s(T,'Centre de support','Fonctionnel','Aucune nouvelle erreur après la recette','Fin de campagne','1. CENTRE DE SUPPORT > Diagnostic & bugs','Pas de nouvelle erreur Java / JavaScript / Ajax due aux tests ; chaque erreur trouvée a un ticket','Haute')
s(T,'Performance','Performance','Temps d\'ouverture des écrans principaux','Base de taille réelle','1. Ouvrir Ventes, Pilotage, Gestion des entrées, Fiche article','Chaque écran utilisable en moins de 3 s ; mesures reportées dans RAPPORT_LENTEUR_CONNEXION.md','Moyenne')

V = 'SERVICE CLIENT'
s(V,'Ouverture de Caisse','Fonctionnel','Ouvrir la caisse','Fonds de caisse attribué','1. Ouvrir la caisse avec le fonds','Caisse ouverte ; les ventes deviennent possibles','Haute')
s(V,'Ventes','Fonctionnel','Vente au comptant','Caisse ouverte, article en stock','1. Nouvelle vente\n2. Scanner ou taper le CIP, Entrée\n3. Quantité\n4. Clôturer, régler en espèces','Ticket imprimé, stock diminué, montant en caisse','Haute')
s(V,'Ventes','Fonctionnel','Vente assurance (tiers-payant)','Client assuré avec tiers-payant et taux','1. Type de vente Assurance\n2. Choisir l\'assuré\n3. Ajouter les articles\n4. Clôturer','Part assurance et part client calculées au taux ; bon enregistré','Haute')
s(V,'Ventes','Fonctionnel','Vente carnet','Client carnet','1. Type Carnet, choisir le client, vendre, clôturer','Montant porté au compte du carnet','Haute')
s(V,'Ventes','Fonctionnel','Changement de tiers-payant sur la vente','Vente assurance en cours','1. Changer le tiers-payant\n2. Valider sans choix puis avec choix','Sans choix : champ signalé ; avec choix : vente mise à jour','Moyenne')
s(V,'Ventes','Ergonomie','Vendeur tapé non reconnu','Nouvelle vente','1. Taper un nom inconnu dans « Vendeur », Tab','Signal immédiat (bordure rouge, infobulle, alerte sans fenêtre) : la vente sera au nom de l\'utilisateur connecté','Moyenne')
s(V,'Ventes','Fonctionnel','Vendeur tapé exact','Nouvelle vente','1. Taper le nom complet d\'un vendeur, Tab','Vendeur reconnu et retenu, pas de signal','Basse')
s(V,'Ventes','Fonctionnel','Quantité décimale dans la grille','Vente avec une ligne','1. Taper 1.5 dans la colonne quantité, Entrée','Quantité enregistrée en entier, sans erreur serveur','Moyenne')
s(V,'Ventes','Fonctionnel','QR code publicitaire scanné','Nouvelle vente','1. Scanner un QR de site internet dans « Produit »','Message « QR code publicitaire » sans fenêtre, champ vidé, aucune recherche lancée','Basse')
s(V,'Ventes','Fonctionnel','Étiquette 2D (GS1) scannée','Paramètre de lecture GS1 actif','1. Scanner un DataMatrix produit','Produit trouvé ; lot comparé, lot périmé refusé','Moyenne')
s(V,'Ventes','Fonctionnel','Règlement en points fidélité','Client avec points, fidélité paramétrée','1. Vente, mode de règlement « Points fidélité »','Points déduits ; montant restant réglé autrement','Moyenne')
s(V,'Ventes','Fonctionnel','Déconditionnement automatique','Article déconditionnable, stock détail insuffisant','1. Vendre au détail','Boîte déconditionnée automatiquement ; historique cohérent','Moyenne')
s(V,'Ventes','Fonctionnel','Modifier le client standard depuis la caisse','Droit P_CLIENT_STANDARD_MAJ','1. Client standard associé\n2. « Modifier », saisir, Entrée','Fiche, vente et caisse à jour ; sans le droit, bouton absent','Basse')
s(V,'Pre-vente','Fonctionnel','Prévente puis clôture en caisse','Profil prévente et caissier','1. Saisir la prévente\n2. La reprendre en caisse et clôturer','Vente reprise avec articles, vendeur et client ; clôturée par le caissier','Haute')
s(V,'Vente dépôt','Fonctionnel','Vente à un dépôt','Dépôt existant','1. Nouvelle vente dépôt, choisir le dépôt, articles, clôturer','Stock du dépôt et de l\'officine à jour','Moyenne')
s(V,'Vente terminées','Fonctionnel','Annuler une vente','Vente du jour','1. Annuler la vente','Stock rendu, caisse corrigée ; la vente apparaît dans « Liste des ventes annulées » ; pas d\'annulation en double','Haute')
s(V,'Vente terminées','Fonctionnel','Réimprimer un ticket','Vente terminée','1. Réimprimer','Ticket identique à l\'original','Basse')
s(V,'Proforma','Fonctionnel','Créer un proforma','Client','1. Nouveau proforma, client, articles\n2. Imprimer','Proforma imprimé, aucun mouvement de stock','Moyenne')
s(V,'Cloture de Caisse','Fonctionnel','Clôturer la caisse','Ventes du jour','1. Clôturer la caisse','Billetage et total conformes aux ventes et mouvements ; caisse fermée','Haute')
s(V,'Ordonnancier','Fonctionnel','Consulter l\'ordonnancier','Ventes avec ordonnance','1. Filtrer par période','Ordonnances de la période, impression possible','Basse')
s(V,'Points fidélité','Fonctionnel','Paramétrer la fidélité','Droit admin','1. Régler points, paliers, produits éligibles, conversion','Les ventes suivantes cumulent les points selon les règles','Moyenne')
s(V,'Rappels traitement','Fonctionnel','Rappel de renouvellement','Client consentant, traitement suivi','1. Ouvrir la liste des rappels','Rappels dus listés ; impression PDF / export','Basse')

G = 'GESTION COURANTE'
s(G,'Ticket Z','Fonctionnel','Ticket Z du jour','Ventes du jour','1. Éditer le ticket Z','Totaux par mode de règlement égaux à la caisse','Haute')
s(G,'Balance Vente/Caisse','Fonctionnel','Balance sur une période','Ventes sur la période','1. Choisir la période','Totaux cohérents avec les ventes terminées de la période','Haute')
s(G,'Mouvements de Caisse','Fonctionnel','Entrée / sortie de caisse','Caisse ouverte','1. Saisir un mouvement','Mouvement visible et pris dans la clôture','Moyenne')

FA = 'FACTURATION'
s(FA,'Gestion des différés','Fonctionnel','Régler un différé','Client avec ventes en différé','1. Choisir le client\n2. Saisir un règlement partiel puis total','Solde mis à jour ; règlement non compté deux fois ; ticket de règlement','Haute')
s(FA,'Factures','Fonctionnel','Générer les factures tiers-payant','Bons de la période','1. Générer pour un organisme','Facture créée avec les bons ; impression et export','Haute')
s(FA,'Liste des Reglements','Fonctionnel','Régler une facture','Facture émise','1. Saisir le règlement','Facture soldée ou partiellement réglée ; balance âgée à jour','Haute')

TP = 'GESTION DES TIERS-PAYANTS'
s(TP,'Tiers-payants','Fonctionnel','Créer / modifier un tiers-payant','Droit','1. Créer, enregistrer, modifier le plafond','Fiche enregistrée ; plafond pris en compte à la vente','Moyenne')
s(TP,'Tiers payants désactivés','Fonctionnel','Lister et réactiver','Tiers-payant désactivé','1. Ouvrir la liste\n2. Rechercher par nom','Seuls les désactivés apparaissent ; recherche OK','Moyenne')
s(TP,'Clients','Fonctionnel','Créer un client assuré','Tiers-payant','1. Créer le client avec matricule et taux','Client utilisable en vente assurance','Haute')
s(TP,'Retour carnet dépôt','Fonctionnel','Retour avec code lu à la douchette','Tiers-payant carnet','1. Nouveau retour, choisir le tiers-payant\n2. Scanner le produit','Produit trouvé ; code envoyé encodé (codes avec / ou # acceptés)','Basse')
s(TP,'Balance agée détaillée','Fonctionnel','Balance âgée','Factures non réglées','1. Ouvrir, filtrer par organisme','Montants par tranche d\'âge cohérents avec les factures','Moyenne')

C = 'GESTION DES COMMANDES'
s(C,'Suggestion de reappro.','Fonctionnel','Générer la suggestion','Ventes et stocks','1. Générer','Quantités proposées selon stock rayon + réserve, limitées à la capacité rayon','Haute')
s(C,'Commande en cours','Fonctionnel','Passer une commande grossiste','Grossiste paramétré','1. Créer la commande, ajouter des lignes\n2. Envoyer (PharmaML si configuré)','Commande envoyée ; l\'envoi PharmaML ne bloque pas l\'écran','Haute')
s(C,'Gestion des entrées','Fonctionnel','Réceptionner un BL','Commande passée','1. Saisir le BL : quantités, prix, lots, péremptions\n2. Valider','Stock augmenté ; BL refusé si des lignes ne sont pas saisies (produits nommés)','Haute')
s(C,'Gestion des entrées','Performance','Gros BL (plusieurs centaines de lignes)','BL de 400+ lignes','1. Ouvrir le BL (écran ou application mobile)','Toutes les lignes en moins de 8 s','Moyenne')
s(C,'Gestion des entrées','Fonctionnel','Scan DataMatrix+/QR+ à la réception','Étiquette 2D','1. Scanner l\'étiquette dans la commande en cours','Prix et quantité repris ; produit créé si absent','Moyenne')
s(C,'Pointer BL et avoirs','Fonctionnel','Pointage avec relevé grossiste PDF','Relevé PDF du grossiste','1. Importer le relevé\n2. Rapprocher','BL et avoirs rapprochés ; écarts listés ; modèle du grossiste mémorisé','Moyenne')
s(C,'Retour fournisseur','Fonctionnel','Retour au grossiste','Produits à retourner','1. Créer le retour : une ligne par produit/motif/lot\n2. Valider','Stock diminué ; retour en attente puis traité','Moyenne')
s(C,'Etat de contrôle Achats','Fonctionnel','Contrôle des achats','Achats de la période','1. Filtrer','Tableau de bord et filtres cohérents ; message complet (non tronqué)','Basse')
s(C,'Péremptions courtes','Fonctionnel','Liste des péremptions courtes','Lots à péremption proche','1. Ouvrir, exporter PDF/Excel','Lots listés avec dates ; exports corrects','Basse')

ST = 'GESTION DU STOCK'
s(ST,'Fiche Article','Fonctionnel','Créer / modifier un article','Droit','1. Créer l\'article (CIP, prix, famille, emplacement)\n2. Modifier le prix','Article vendable ; mouvement de prix tracé (Mouchard)','Haute')
s(ST,'Travaux d\'Inventaire','Fonctionnel','Inventaire partiel','Rayon choisi','1. Créer l\'inventaire limité aux produits du rayon\n2. Saisir (CIP/GTIN/EAN)\n3. Clôturer','Écarts appliqués au stock ; auteur des saisies tracé','Haute')
s(ST,'Ajustement du Stock','Fonctionnel','Ajustement rayon','Article','1. Ajouter un ajustement avec motif\n2. Valider','Stock corrigé, mouvement tracé','Haute')
s(ST,'Saisie des périmés','Fonctionnel','Saisir des périmés','Lots périmés','1. Saisir le lot et la quantité','Stock diminué ; périmé visible dans « Périmés rétirés du stock »','Moyenne')
s(ST,'Gestion des réserves','Fonctionnel','Réserve : ajout et réassort','Article avec réserve','1. Ajouter une ligne de réserve\n2. Réassort vers le rayon','Stocks rayon / réserve cohérents','Moyenne')
s(ST,'Étiquettage Pro','Fonctionnel','Imprimer des étiquettes','Imprimante ou PDF','1. Importer CSV/Excel ou saisir\n2. Choisir le type de code\n3. Imprimer','Étiquettes conformes au modèle, codes lisibles','Basse')
s(ST,'Valorisation du stock','Fonctionnel','Valorisation','Stock','1. Lancer la valorisation','Valeur au prix d\'achat et de vente cohérente avec l\'état de stock','Moyenne')

A = 'ANALYSE DE GESTION'
s(A,'Pilotage de l\'officine','Fonctionnel','Tableau de pilotage','Ventes et achats','1. Ouvrir, changer la période (jour, mois)','Indicateurs cohérents avec les ventes ; « À suivre » chargé','Haute')
s(A,'Pilotage de l\'officine','Performance','Ouverture du pilotage','Base de taille réelle','1. Ouvrir le pilotage (poste et mobile)','Affiché en quelques secondes','Moyenne')
s(A,'Statistique famille','Fonctionnel','Stats par rayon / grossiste','Ventes','1. Filtrer par rayon puis grossiste','Valeurs chiffrées (jamais NaN), cohérentes avec le CA','Moyenne')
s(A,'Classification ABC','Performance','Export ABC','Base réelle','1. Exporter','Export obtenu en temps raisonnable, totaux cohérents','Basse')
s(A,'Gestion des gardes','Fonctionnel','Préparer une garde','Garde planifiée','1. Créer la garde, vendeurs, commandes','PDF vendeurs / commandes / activité corrects','Basse')

PA = 'PARAMETRAGES'
s(PA,'Fournisseurs SMS','Fonctionnel','Configurer Orange / LeTexto','Identifiants du fournisseur','1. Ouvrir la fiche\n2. Renseigner les champs (indications grisées)\n3. Tester\n4. Mettre en vigueur','Test OK ; fournisseur en vigueur ; secrets jamais réaffichés','Haute')
s(PA,'Fournisseurs SMS','Sécurité','Secrets masqués','Fiche avec client secret','1. Rouvrir la fiche','Le secret apparaît masqué ; laisser le masque ne le change pas','Haute')
s(PA,'Paramétrage général','Fonctionnel','Modifier un paramètre','Droit admin','1. Modifier une valeur, enregistrer','Valeur prise en compte sans redémarrage','Moyenne')
s(PA,'Identification Pharmacie','Fonctionnel','Informations officine','Droit','1. Modifier le nom abrégé','Nom repris sur tickets et badges','Basse')

N = 'NOTIFICATIONS'
s(N,'Gestion des Sms','Fonctionnel','Messages sortants','SMS envoyés','1. Rechercher un message, renvoyer','Statut à jour ; renvoi possible','Basse')
s('Campagnes SMS / WhatsApp','Campagnes','Fonctionnel','Campagne SMS / WhatsApp','Clients consentants','1. Créer, cibler, envoyer','Seuls les consentants reçoivent ; texte des messages jamais journalisé','Moyenne')

RH = 'RESSOURCES HUMAINES'
s(RH,'Ressources humaines','Fonctionnel','Employé créé à partir d\'un utilisateur','Utilisateur sans fiche','1. Onglet Employés > Nouvel employé, choisir l\'utilisateur','Fiche pré-remplie et rattachée','Moyenne')
s(RH,'Ressources humaines','Fonctionnel','Créer et imprimer un badge QR','Employé rattaché','1. Onglet Badges : créer (numéro automatique)\n2. Cocher, Imprimer (QR, A4 ou carte)','PDF avec QR centré ; impression comptée','Haute')
s(RH,'Ressources humaines','Fonctionnel','Réimpression du badge','Badge déjà imprimé en QR','1. Réimprimer','Même QR ; l\'ancien exemplaire reste valable jusqu\'à l\'expiration','Haute')
s(RH,'Ressources humaines','Fonctionnel','Régénérer le QR','Badge actif','1. Fiche du badge > « Régénérer le QR » (2 clics)','Nouveau QR ; anciens exemplaires refusés ; message de réimpression','Haute')
s(RH,'Ressources humaines','Ergonomie','Badge d\'un employé sans compte','Employé non rattaché','1. Onglet Badges','Ligne marquée « Sans compte utilisateur » ; avertissement à l\'impression QR','Moyenne')
s(RH,'Ressources humaines','Fonctionnel','Désactiver un badge','Badge actif','1. Désactiver (2 clics), motif','Badge désactivé : plus de pointage ni de connexion','Haute')
s(RH,'Ressources humaines','Fonctionnel','Pointage','Droit P_RH_POINTER','1. Pointer depuis la session ou le QR de pointage','Présence enregistrée ; planning et tableau à jour','Moyenne')

SU = 'CENTRE DE SUPPORT'
s(SU,'Santé application','Fonctionnel','Indicateurs de santé','—','1. Ouvrir Santé application','Base, mémoire, erreurs, e-mail expéditeur, SMS : chaque ligne dit « Configuré » ou ce qui manque','Haute')
s(SU,'Santé application','Fonctionnel','SMS non configuré signalé','Client ID vide sur le fournisseur','1. Ouvrir Santé','« SMS : Non configuré… À renseigner : Client ID »','Moyenne')
s(SU,'Me contacter','Fonctionnel','Demande au support','Expéditeur e-mail configuré','1. Envoyer une demande avec pièce jointe','Demande envoyée ; sans expéditeur : « échec d\'envoi » avec le message de configuration','Moyenne')
s(SU,'Diagnostic & bugs','Fonctionnel','Auto-diagnostic','—','1. Lancer les contrôles de cohérence','Résultats affichés ; migrations Flyway en échec signalées','Moyenne')

# ---------------------------------------------------------------- classeur : une feuille par module + synthese
import re
from collections import OrderedDict

COLS = [('N°',5),('Écran',22),('Type de test',12),('Cas de test',30),('Prérequis',22),('Étapes',42),('Résultat attendu',42),
        ('Priorité',9),('Testeur',11),('Date',10),('Statut',10),('Résultat obtenu / anomalie',30),('N° ticket',9),
        ('Résultat (exécution automatique)',13),('Détail / preuve de l\'exécution automatique',38)]
NC = len(COLS); DERCOL = get_column_letter(NC)          # M
COL_STATUT = get_column_letter(11); COL_PRIO = get_column_letter(8); COL_DATE = get_column_letter(10)
bleu = PatternFill('solid', start_color='1F4E78'); clair = PatternFill('solid', start_color='DDEBF7'); jaune = PatternFill('solid', start_color='FFF2CC'); gris = PatternFill('solid', start_color='EDEDED')
fin = Side(style='thin', color='B4C6E7'); bord = Border(left=fin, right=fin, top=fin, bottom=fin)
STATUTS = ['Non testé', 'OK', 'KO', 'Bloqué', 'N/A']
PREM = 13

# resultats de l'execution automatique (facultatifs) : RESULTATS_TESTS (executer-recette.js), RESULTATS_ECRANS
# (recette-ecrans.js), correspondance cas -> tests (docs/recette/correspondance-tests.json)
import json, os
def charger(var):
    p = os.environ.get(var)
    return json.load(open(p, encoding='utf-8')) if p and os.path.exists(p) else None
R_TESTS = charger('RESULTATS_TESTS'); R_ECRANS = charger('RESULTATS_ECRANS')
CORR = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'recette', 'correspondance-tests.json'), encoding='utf-8'))
DATE_EXEC = os.environ.get('DATE_EXECUTION', '')

def resultat_scenario(i):
    if R_TESTS is None:
        return ('', '')
    c = CORR.get(str(i), {})
    if 'raison' in c:
        return ('NON EXÉCUTÉ', c['raison'][:1].upper() + c['raison'][1:])
    lignes, ko = [], False
    for t in c.get('tests', []):
        r = R_TESTS.get(t)
        if not r:
            return ('NON EXÉCUTÉ', 'Test ' + t + ' non lancé')
        lignes.append(t + ' : ' + r['bilan'] + ('' if r['ok'] else ' — ' + ' | '.join(r['fails'])[:400]))
        ko = ko or not r['ok']
    if ko:
        return ('KO', '\n'.join(lignes))
    if c.get('couverture') == 'partielle':
        return ('OK PARTIEL', '\n'.join(lignes) + '\nNon couvert : ' + c.get('manque', ''))
    return ('OK', '\n'.join(lignes))

E_PAR_CLE = {}
for r in (R_ECRANS or []):
    E_PAR_CLE.setdefault((r['menu'], r['ecran']), r)

def resultat_ecran(m, e):
    if R_ECRANS is None:
        return ('', '')
    r = E_PAR_CLE.get((m, e))
    if not r:
        return ('NON EXÉCUTÉ', 'Écran non parcouru')
    return (r['resultat'].replace('NON EXECUTE', 'NON EXÉCUTÉ'), 'recette/recette-ecrans.js : ' + r['detail'] + (' — ' + DATE_EXEC if DATE_EXEC else ''))

# lignes par module : scenarios metier puis une ligne « ouverture et affichage » par ecran du menu
modules = OrderedDict()
for i, x in enumerate(S):
    modules.setdefault(x[0], []).append(tuple(x[1:]) + ('', '', '', '', '') + resultat_scenario(i))
vus = set()
with open(MENUS, encoding='utf-8') as fh:
    for m, e, comp in csv.reader(fh, delimiter='\t'):
        if (m, e) in vus:
            continue
        vus.add((m, e))
        modules.setdefault(m, []).append((e, 'Non-régression', 'Ouverture et affichage de l\'écran', 'Profil ayant le droit du menu',
            '1. Ouvrir ' + m + ' > ' + e + '\n2. Utiliser la recherche / les filtres de l\'écran\n3. Imprimer ou exporter si l\'écran le propose',
            'L\'écran s\'ouvre sans message d\'erreur ; la liste se charge ; filtres et impression/export fonctionnent ; aucune erreur au Centre de support',
            'Moyenne' if m in ('SERVICE CLIENT', 'GESTION COURANTE', 'GESTION DES COMMANDES', 'GESTION DU STOCK', 'FACTURATION') else 'Basse',
            '', '', '', '', '') + resultat_ecran(m, e))

# onglets dans l'ordre du menu de Prestige, les controles transversaux en premier
ordre = ['Transversal']
with open(MENUS, encoding='utf-8') as fh:
    for m, e, comp in csv.reader(fh, delimiter='\t'):
        if m not in ordre:
            ordre.append(m)
modules = OrderedDict(sorted(modules.items(), key=lambda kv: ordre.index(kv[0]) if kv[0] in ordre else len(ordre)))

def nom_feuille(m, pris):
    n = re.sub(r'[\[\]\*\?/\\:]', '-', m).strip()[:31]
    n = n[:1] + n[1:].lower() if n.isupper() else n
    base, k = n, 2
    while n in pris:
        n = (base[:28] + ' ' + str(k)); k += 1
    pris.add(n)
    return n

def mise_en_page(ws, der, titre_rangee):
    ws.print_area = 'A1:%s%d' % (DERCOL, der)
    ws.print_title_rows = titre_rangee
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.orientation = 'landscape'; ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_margins.left = ws.page_margins.right = 0.2
    ws.page_margins.top = 0.35; ws.page_margins.bottom = 0.35
    ws.page_margins.header = ws.page_margins.footer = 0.15
    ws.print_options.horizontalCentered = True
    ws.oddFooter.left.text = '&A'; ws.oddFooter.left.size = 8
    ws.oddFooter.center.text = 'Page &P / &N'; ws.oddFooter.center.size = 8
    ws.oddFooter.right.text = 'Cahier de recette Prestige'; ws.oddFooter.right.size = 8

def feuille_module(wb, nom, module, lignes):
    ws = wb.create_sheet(nom)
    der = PREM + len(lignes) - 1
    plage = '$%s$%d:$%s$%d' % (COL_STATUT, PREM, COL_STATUT, der)
    ws['A1'] = 'PRESTIGE — Cahier de recette — ' + module; ws['A1'].font = f(bold=True, size=15, color='1F4E78')
    ws.merge_cells('A1:%s1' % DERCOL)
    ws['A2'] = 'Version testée :'; ws['E2'] = 'Base de test (jamais la production) :'
    for c in ('A2', 'E2'): ws[c].font = f(bold=True)
    for c in ('C2', 'G2'): ws[c].fill = jaune; ws[c].font = f(color='0000FF'); ws[c].border = bord
    ws['A4'] = 'Synthèse du module'; ws['A4'].font = f(bold=True, size=12, color='1F4E78')
    ws['A5'] = 'Total des cas'; ws['C5'] = '=COUNTA($A$%d:$A$%d)' % (PREM, der)
    for i, st in enumerate(STATUTS):
        r = 6 + i
        ws['A%d' % r] = st
        ws['C%d' % r] = ('=C5-COUNTIF(%s,"OK")-COUNTIF(%s,"KO")-COUNTIF(%s,"Bloqué")-COUNTIF(%s,"N/A")' % (plage, plage, plage, plage)) if st == 'Non testé' else '=COUNTIF(%s,"%s")' % (plage, st)
        ws['D%d' % r] = '=IF($C$5=0,0,C%d/$C$5)' % r; ws['D%d' % r].number_format = '0.0%'
    ws['E5'] = 'Avancement (testés hors N/A)'; ws['G5'] = '=IF(($C$5-$C$10)=0,0,($C$7+$C$8+$C$9)/($C$5-$C$10))'; ws['G5'].number_format = '0.0%'
    ws['E6'] = 'Taux de réussite (OK / testés)'; ws['G6'] = '=IF(($C$7+$C$8+$C$9)=0,0,$C$7/($C$7+$C$8+$C$9))'; ws['G6'].number_format = '0.0%'
    ws['E7'] = 'KO en priorité Haute'; ws['G7'] = '=COUNTIFS(%s,"KO",$%s$%d:$%s$%d,"Haute")' % (plage, COL_PRIO, PREM, COL_PRIO, der)
    for r in range(5, 11):
        for c in ('A', 'C', 'D'):
            ws['%s%d' % (c, r)].font = f(bold=(c == 'A')); ws['%s%d' % (c, r)].border = bord
    for r in range(5, 8):
        for c in ('E', 'G'):
            ws['%s%d' % (c, r)].font = f(bold=(c == 'E')); ws['%s%d' % (c, r)].border = bord
    ws['I4'] = 'Mode d\'emploi'; ws['I4'].font = f(bold=True, size=12, color='1F4E78')
    aide = ['Remplir uniquement les cellules jaunes : Testeur, Date (jj/mm/aaaa), Statut (liste), Résultat obtenu, N° ticket.',
            'Statut : Non testé (vide) · OK · KO (décrire et ouvrir un ticket) · Bloqué · N/A (sans objet).',
            'Exemple : Testeur « A. KONÉ » · Date 24/10/2026 · Statut KO · Résultat « Ticket sans le nom du vendeur » · Ticket « SUP-0042 ».',
            'Tests sur la copie de travail uniquement, jamais la base de production ; sauvegarder la base avant chaque série.',
            'Ajouter un cas : insérer une ligne dans le tableau. Colonnes grises : résultat de l\'exécution automatique sur le banc (ne pas modifier).']
    for k, t in enumerate(aide):
        r = 5 + k
        ws['I%d' % r] = t; ws.merge_cells('I%d:%s%d' % (r, DERCOL, r))
        ws['I%d' % r].font = f(size=9); ws['I%d' % r].alignment = Alignment(wrap_text=True, vertical='top')
        ws.row_dimensions[r].height = 24
    h = PREM - 1
    for i, (nomc, larg) in enumerate(COLS, 1):
        c = ws.cell(row=h, column=i, value=nomc)
        c.font = f(bold=True, color='FFFFFF'); c.fill = bleu; c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); c.border = bord
        ws.column_dimensions[get_column_letter(i)].width = larg
    ws.row_dimensions[h].height = 30
    for n, x in enumerate(lignes):
        r = PREM + n
        for i, v in enumerate([n + 1] + list(x), 1):
            c = ws.cell(row=r, column=i, value=v)
            c.font = f(size=9); c.alignment = Alignment(vertical='top', wrap_text=True); c.border = bord
            if n % 2: c.fill = clair
        for i in range(9, 14):
            c = ws.cell(row=r, column=i); c.fill = jaune; c.font = f(size=9, color='0000FF'); c.border = bord
            c.alignment = Alignment(vertical='top', wrap_text=True)
        for i in (14, 15):
            c = ws.cell(row=r, column=i); c.fill = gris; c.border = bord
            c.font = f(size=9, bold=(i == 14)); c.alignment = Alignment(vertical='top', wrap_text=True, horizontal='center' if i == 14 else None)
        ws.cell(row=r, column=10).number_format = 'dd/mm/yyyy'
    dv = DataValidation(type='list', formula1='"Non testé,OK,KO,Bloqué,N/A"', allow_blank=True)
    dv.error = 'Choisir un statut dans la liste'; dv.prompt = 'Non testé, OK, KO, Bloqué ou N/A'
    ws.add_data_validation(dv); dv.add('%s%d:%s%d' % (COL_STATUT, PREM, COL_STATUT, der + 200))
    dvd = DataValidation(type='date', operator='greaterThan', formula1='DATE(2020,1,1)', allow_blank=True)
    dvd.error = 'Date attendue (jj/mm/aaaa)'; ws.add_data_validation(dvd); dvd.add('%s%d:%s%d' % (COL_DATE, PREM, COL_DATE, der + 200))
    zone = '%s%d:%s%d' % (COL_STATUT, PREM, COL_STATUT, der + 200)
    ws.conditional_formatting.add(zone, CellIsRule(operator='equal', formula=['"OK"'], fill=PatternFill('solid', start_color='C6EFCE'), font=Font(name=F, color='006100', bold=True)))
    ws.conditional_formatting.add(zone, CellIsRule(operator='equal', formula=['"KO"'], fill=PatternFill('solid', start_color='FFC7CE'), font=Font(name=F, color='9C0006', bold=True)))
    ws.conditional_formatting.add(zone, CellIsRule(operator='equal', formula=['"Bloqué"'], fill=PatternFill('solid', start_color='FFEB9C'), font=Font(name=F, color='9C5700', bold=True)))
    zauto = 'N%d:N%d' % (PREM, der)
    ws.conditional_formatting.add(zauto, FormulaRule(formula=['LEFT(N%d,2)="OK"' % PREM], fill=PatternFill('solid', start_color='C6EFCE'), font=Font(name=F, color='006100', bold=True)))
    ws.conditional_formatting.add(zauto, CellIsRule(operator='equal', formula=['"KO"'], fill=PatternFill('solid', start_color='FFC7CE'), font=Font(name=F, color='9C0006', bold=True)))
    ws['E8'] = 'Exécution automatique : OK / OK partiel / KO / non exécuté'
    ws['G8'] = '=COUNTIF(N%d:N%d,"OK")&" / "&COUNTIF(N%d:N%d,"OK PARTIEL")&" / "&COUNTIF(N%d:N%d,"KO")&" / "&COUNTIF(N%d:N%d,"NON EXÉCUTÉ")' % ((PREM, der) * 4)
    for c in ('E8', 'G8'): ws[c].font = f(bold=(c == 'E8')); ws[c].border = bord
    ws.freeze_panes = 'E%d' % PREM
    ws.auto_filter.ref = 'A%d:%s%d' % (h, DERCOL, der)
    mise_en_page(ws, der, '%d:%d' % (h, h))
    return ws, der

wb = Workbook()
syn = wb.active; syn.title = 'Synthèse'
pris = {'Synthèse'}
feuilles = []
for m, lignes in modules.items():
    nom = nom_feuille(m, pris)
    ws, der = feuille_module(wb, nom, m, lignes)
    feuilles.append((m, nom, len(lignes)))

# feuille Synthese : une ligne par module, totaux par formules
syn['A1'] = 'PRESTIGE — Cahier de recette — Synthèse'; syn['A1'].font = f(bold=True, size=16, color='1F4E78')
syn['A2'] = 'Une feuille par module (onglets en bas). Les chiffres ci-dessous se calculent depuis la colonne Statut de chaque feuille.'
syn['A2'].font = f(size=9, italic=True)
ent = ['Module', 'Feuille', 'Cas', 'OK', 'KO', 'Bloqué', 'N/A', 'Non testé', 'Avancement', 'Réussite', 'KO priorité Haute',
       'Auto : OK', 'Auto : OK partiel', 'Auto : KO', 'Auto : non exécuté']
larg = [30, 26, 8, 8, 8, 9, 8, 11, 14, 11, 14, 10, 11, 10, 12]
for i, (t, l) in enumerate(zip(ent, larg), 1):
    c = syn.cell(row=4, column=i, value=t); c.font = f(bold=True, color='FFFFFF'); c.fill = bleu; c.border = bord
    c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    syn.column_dimensions[get_column_letter(i)].width = l
for k, (m, nom, n) in enumerate(feuilles):
    r = 5 + k; q = "'%s'!" % nom.replace("'", "''")
    syn.cell(row=r, column=1, value=m)
    c = syn.cell(row=r, column=2, value=nom); c.hyperlink = "#%s$A$1" % q; c.font = f(size=10, color='0563C1', underline='single')
    syn.cell(row=r, column=3, value='=%s$C$5' % q)
    for j, cel in enumerate(['$C$7', '$C$8', '$C$9', '$C$10', '$C$6'], 4):
        syn.cell(row=r, column=j, value='=%s%s' % (q, cel))
    syn.cell(row=r, column=9, value='=%s$G$5' % q).number_format = '0.0%'
    syn.cell(row=r, column=10, value='=%s$G$6' % q).number_format = '0.0%'
    syn.cell(row=r, column=11, value='=%s$G$7' % q)
    zone = '%s$N$%d:$N$%d' % (q, PREM, PREM + n - 1)
    for j, v in enumerate(['OK', 'OK PARTIEL', 'KO', 'NON EXÉCUTÉ'], 12):
        syn.cell(row=r, column=j, value='=COUNTIF(%s,"%s")' % (zone, v))
    for i in range(1, 16):
        c = syn.cell(row=r, column=i); c.border = bord
        if i != 2: c.font = f(size=10)
        if k % 2: c.fill = clair
der_s = 4 + len(feuilles); t = der_s + 1
syn.cell(row=t, column=1, value='TOTAL').font = f(bold=True)
for j in range(3, 9):
    L = get_column_letter(j)
    syn.cell(row=t, column=j, value='=SUM(%s5:%s%d)' % (L, L, der_s)).font = f(bold=True)
syn.cell(row=t, column=9, value='=IF((C%d-G%d)=0,0,(D%d+E%d+F%d)/(C%d-G%d))' % (t, t, t, t, t, t, t)).number_format = '0.0%'
syn.cell(row=t, column=10, value='=IF((D%d+E%d+F%d)=0,0,D%d/(D%d+E%d+F%d))' % (t, t, t, t, t, t, t)).number_format = '0.0%'
syn.cell(row=t, column=11, value='=SUM(K5:K%d)' % der_s)
for j in range(12, 16):
    L = get_column_letter(j)
    syn.cell(row=t, column=j, value='=SUM(%s5:%s%d)' % (L, L, der_s))
for i in range(1, 16):
    c = syn.cell(row=t, column=i); c.border = bord; c.fill = PatternFill('solid', start_color='BDD7EE'); c.font = f(bold=True)
syn.freeze_panes = 'A5'
syn.print_area = 'A1:O%d' % t
syn.page_setup.paperSize = syn.PAPERSIZE_A4; syn.page_setup.orientation = 'landscape'
syn.page_setup.fitToWidth = 1; syn.page_setup.fitToHeight = 1; syn.sheet_properties.pageSetUpPr.fitToPage = True
syn.page_margins.left = syn.page_margins.right = 0.3
syn.print_options.horizontalCentered = True
wb.save(SORTIE)
print(sum(n for _, _, n in feuilles), 'cas,', len(feuilles), 'feuilles de module,', len(S), 'scénarios métier')
