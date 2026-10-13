"""
Télécharge tous les fichiers Flash depuis GitHub vers le dossier local data/
et recompile flash_summary.json (sans aucun token - 100% public)
"""
import urllib.request
import json
import os
import xlrd
import re

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data_dir = os.path.join(base_dir, 'data')
os.makedirs(data_dir, exist_ok=True)

print("Synchronisation des données Flash depuis GitHub vers", data_dir)

# 1. Lire manifest public
manifest_url = 'https://raw.githubusercontent.com/hichamatlas75-del/Fiche-technique/main/flash_serveurs/manifest.json'
try:
    with urllib.request.urlopen(manifest_url) as resp:
        manifest = json.loads(resp.read().decode('utf-8'))
        with open(os.path.join(data_dir, 'manifest.json'), 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2)
        files = manifest.get('files', [])
        print(f"Manifest contient {len(files)} fichier(s).")
except Exception as e:
    print("Erreur lecture manifest :", e)
    files = []

# 2. Télécharger les fichiers manquants
count = 0
for rel in files:
    dest = os.path.join(data_dir, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest):
        continue
    f_url = f'https://raw.githubusercontent.com/hichamatlas75-del/Fiche-technique/main/flash_serveurs/{rel}'
    try:
        with urllib.request.urlopen(f_url) as f_resp:
            content = f_resp.read()
            with open(dest, 'wb') as out_f:
                out_f.write(content)
            count += 1
            print(f"+ Téléchargé : {rel}")
    except Exception as e:
        print(f"Erreur sur {rel}:", e)

print(f"Téléchargement terminé : {count} nouveau(x) fichier(s).")

# 3. Recompiler flash_summary.json
alias_map = {
    'YOUNESS': {'id': 'MOHSINE_YOUNESS', 'displayName': 'Youness Mohssine', 'role': 'Serveur', 'photo': 'images/MOHSSINE_YOUNESS.jpg'},
    'MOKHTAR': {'id': 'MOKHTAR', 'displayName': 'Mokhtar', 'role': 'Serveur', 'photo': 'images/Mokhtar.jpg'},
    'YOUSSEF': {'id': 'HIDARA_YOUSSEF', 'displayName': 'Youssef Hidara', 'role': 'Serveur', 'photo': 'images/HIDARA-LACHKAR_YOUSSEF.jpg'},
    'ZAKARIA': {'id': 'KAFOUNI_ZAKARIAE', 'displayName': 'Zakariae Kafouni', 'role': 'Serveur', 'photo': 'images/KAFOUNI_ZAKARIAE.jpg'},
    'AZIZ': {'id': 'ALAOUI_LAZIZ', 'displayName': 'Abdelaziz Alaoui', 'role': 'Serveur', 'photo': 'images/HAMID_ALAOUI_ABDELAZIZ.jpg'},
    'LAZIZ': {'id': 'ALAOUI_LAZIZ', 'displayName': 'Abdelaziz Alaoui', 'role': 'Serveur', 'photo': 'images/HAMID_ALAOUI_ABDELAZIZ.jpg'},
    'ABDELAZIZ': {'id': 'ALAOUI_LAZIZ', 'displayName': 'Abdelaziz Alaoui', 'role': 'Serveur', 'photo': 'images/HAMID_ALAOUI_ABDELAZIZ.jpg'},
    'SIMO': {'id': 'HATTAF_MOHAMED', 'displayName': 'Mohamed Hattaf', 'role': 'Serveur', 'photo': 'images/HATTAF_MOHAMMED.jpg'},
    'HATTAF': {'id': 'HATTAF_MOHAMED', 'displayName': 'Mohamed Hattaf', 'role': 'Serveur', 'photo': 'images/HATTAF_MOHAMMED.jpg'},
    'MOHAMED': {'id': 'HATTAF_MOHAMED', 'displayName': 'Mohamed Hattaf', 'role': 'Serveur', 'photo': 'images/HATTAF_MOHAMMED.jpg'},
    'MOHAMMED': {'id': 'HATTAF_MOHAMED', 'displayName': 'Mohamed Hattaf', 'role': 'Serveur', 'photo': 'images/HATTAF_MOHAMMED.jpg'},
    'GLOVO': {'id': 'EMP_GLOVO', 'displayName': 'Commandes Glovo', 'role': 'Livraisons & Emporté', 'photo': 'images/LOGO.jpg'},
}

def resolve_server(raw):
    raw_clean = raw.strip().upper()
    for k, v in alias_map.items():
        if k in raw_clean:
            return v
    return {'id': 'SRV_' + raw_clean.replace(' ', '_'), 'displayName': raw.strip(), 'role': 'Serveur', 'photo': None}

all_sessions = []
for root, dirs, f_list in os.walk(data_dir):
    for f in sorted(f_list):
        if not f.endswith('.xls'): continue
        m = re.search(r'(\d{4})(\d{2})(\d{2})', f)
        if not m: continue
        date_str = f'{m.group(1)}-{m.group(2)}-{m.group(3)}'
        ym_str = f'{m.group(1)}-{m.group(2)}'
        
        full_path = os.path.join(root, f)
        try:
            wb = xlrd.open_workbook(full_path)
            sh = wb.sheet_by_index(0)
            col_srv, col_net = 1, 2
            servers_data = []
            total_net = 0.0
            
            for r in range(sh.nrows):
                vals = [str(sh.cell_value(r, c)).strip() for c in range(sh.ncols)]
                if r == 0 and any('SERVEUR' in v.upper() for v in vals):
                    for c, v in enumerate(vals):
                        if 'SERVEUR' in v.upper() or 'VENDEUR' in v.upper(): col_srv = c
                        if 'NET' in v.upper(): col_net = c
                    continue
                srv_name = str(sh.cell_value(r, col_srv)).strip()
                if not srv_name or srv_name.upper().startswith('CAISSIER') or srv_name.upper().startswith('TOTAL'):
                    continue
                try: net_val = float(sh.cell_value(r, col_net))
                except: net_val = 0.0
                if net_val > 0:
                    srv_obj = resolve_server(srv_name)
                    servers_data.append({
                        'server': srv_obj,
                        'rawName': srv_name,
                        'totalNet': round(net_val, 2),
                        'tickets': 0
                    })
                    total_net += net_val
            all_sessions.append({
                'fileName': f,
                'date': date_str,
                'yearMonth': ym_str,
                'totalNetGlobal': round(total_net, 2),
                'servers': servers_data
            })
        except Exception as e:
            pass

out_json = os.path.join(data_dir, 'flash_summary.json')
with open(out_json, 'w', encoding='utf-8') as out:
    json.dump(all_sessions, out, ensure_ascii=False, indent=2)

out_js = os.path.join(data_dir, 'flash_summary.js')
with open(out_js, 'w', encoding='utf-8') as out:
    out.write("window.FLASH_SUMMARY_DATA = " + json.dumps(all_sessions, ensure_ascii=False, indent=2) + ";\n")

print(f"Synthese recompilee : {len(all_sessions)} sessions dans flash_summary.json et flash_summary.js.")
