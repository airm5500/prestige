'use strict';
/* Connecteur FAUX (WHATSAPP_FAUX=1) : pour les essais de Prestige sans telephone. Un QR factice est affiche ; avec
   WHATSAPP_FAUX_CONNECTE=1, le « scan » est simule 3 s apres le premier affichage du QR ; les envois reussissent sans
   rien envoyer. */
function creerConnecteur({ journal }) {
  const etat = { etat: 'QR', numero: null, depuis: new Date().toISOString() };
  let qrVu = null;
  let n = 0;
  const majEtat = () => { if (etat.etat === 'QR' && qrVu && Date.now() - qrVu > 3000 && process.env.WHATSAPP_FAUX_CONNECTE === '1') { Object.assign(etat, { etat: 'CONNECTE', numero: '2250700000000' }); } };
  return {
    etat: () => { majEtat(); return Object.assign({}, etat, { faux: true }); },
    qrImage: () => { qrVu = qrVu || Date.now(); return 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#fff"/><rect x="20" y="20" width="60" height="60"/><rect x="120" y="20" width="60" height="60"/><rect x="20" y="120" width="60" height="60"/><text x="100" y="110" font-size="12" text-anchor="middle">ESSAI</text></svg>').toString('base64'); },
    pret: () => { majEtat(); return etat.etat === 'CONNECTE'; },
    existe: async () => true,
    ecrire: async () => {},
    envoyer: async () => 'faux-' + (++n),
    deconnecter: async () => { qrVu = null; Object.assign(etat, { etat: 'QR', numero: null }); journal('deconnexion (faux)'); }
  };
}
module.exports = { creerConnecteur };
