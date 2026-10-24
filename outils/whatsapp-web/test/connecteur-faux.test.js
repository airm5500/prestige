'use strict';
/* Connecteur FAUX : la trace des envois (pour les tests de Prestige) decrit la piece jointe sans numero ni texte. */
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

test('trace des envois : nature, type et empreinte de la piece, jamais le numero ni le texte', async () => {
  const trace = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wa-f-')), 'trace.jsonl');
  process.env.WHATSAPP_FAUX_TRACE = trace;
  try {
    const { creerConnecteur } = require('../src/connecteur-faux');
    const c = creerConnecteur({ journal: () => {} });
    const png = Buffer.from('89504e470d0a1a0a', 'hex');
    await c.envoyer('2250708091011', 'Texte confidentiel');
    await c.envoyerMedia('2250708091011', { type: 'image', mimeType: 'image/png', nomFichier: 'v.png', donnees: png }, 'Légende confidentielle');
    const contenu = fs.readFileSync(trace, 'utf8');
    const l = contenu.trim().split('\n').map((x) => JSON.parse(x));
    assert.deepStrictEqual(l[0], { nature: 'texte', legende: true });
    assert.deepStrictEqual(l[1], { nature: 'media', type: 'image', mimeType: 'image/png', nomFichier: 'v.png', octets: 8,
      sha256: crypto.createHash('sha256').update(png).digest('hex'), legende: true });
    assert.ok(!/confidentiel|0708091011/i.test(contenu), contenu);
  } finally {
    delete process.env.WHATSAPP_FAUX_TRACE;
  }
});
