/*
 * Compare le temps reel de requetes SQL (ANALYZE FORMAT=JSON, 3 essais) et l'empreinte de leur resultat.
 * Usage : MARIADB_OPTIONS=perf.cnf DB=appaul_perf node comparer-plans.js a.sql b.sql ...
 * Chaque fichier contient UNE requete SELECT. Lecture seule : ANALYZE d'un SELECT n'ecrit rien.
 */
const fs = require('fs');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const CLIENT = process.env.MARIADB_CLIENT || 'D:/Program Files/MariaDB 10.6/bin/mariadb.exe';
const OPTIONS = process.env.MARIADB_OPTIONS;
const DB = process.env.DB;
if (!OPTIONS || !DB) {
    console.error('MARIADB_OPTIONS et DB sont obligatoires');
    process.exit(2);
}

function client(sql) {
    return execFileSync(CLIENT, ['--defaults-extra-file=' + OPTIONS, DB, '-N', '-r', '-e', sql],
        { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).replace(/\r/g, '');
}

for (const f of process.argv.slice(2)) {
    const sql = fs.readFileSync(f, 'utf8').replace(/;\s*$/, '');
    const essais = [];
    let ordre = '';
    for (let i = 0; i < 3; i++) {
        const j = JSON.parse(client('SET SESSION max_statement_time=300; ANALYZE FORMAT=JSON ' + sql));
        const tables = [];
        const parcourir = (o) => {
            if (o && typeof o === 'object') {
                if (o.table_name) {
                    tables.push(o.table_name + '(' + (o.key || o.access_type) + ')');
                }
                Object.values(o).forEach(parcourir);
            }
        };
        parcourir(j);
        ordre = tables.slice(0, 3).join(' > ');
        essais.push(Math.round(j.query_block.r_total_time_ms));
    }
    const lignes = client('SET SESSION max_statement_time=300; START TRANSACTION READ ONLY; ' + sql + '; ROLLBACK;')
        .split('\n').filter(Boolean).sort().join('\n');
    const empreinte = crypto.createHash('md5').update(lignes).digest('hex').slice(0, 12);
    console.log(`${f}\t${essais.join(' / ')} ms\tempreinte ${empreinte}\t${ordre}`);
}
