# Rapport de données — version 3.6.11.15

Produit par `npm run data:report` à partir du snapshot brut et du dataset compilé. Données issues de DofusDB. Utilisation soumise à la LPNC-IA 1.0.

## 1. Volumes

Quêtes 1976 · succès 2780 · objets 3989 · monstres 2151 · donjons 187 · PNJ 2476 · objectifs au catalogue 25.

## 2. Critères par source

### 2.1 Lancement de quête (`startCriterion`)

- Total : **1976** (dont 0 vides) · analysés sans erreur : **1976 / 1976** (100.00 %)
- Arguments par atome : jusqu'à 2 · atomes avec un argument alphabétique : 1
- Précédence mélangée (`&` et `|` au même niveau) : **0**

| Clé | Occurrences | Dans la table §4 |
|---|---:|---|
| `PL` | 1523 | oui |
| `Qf` | 1417 | oui |
| `Qa` | 813 | oui |
| `Ad` | 390 | oui |
| `Pr` | 348 | oui |
| `Ps` | 281 | oui |
| `Pa` | 264 | oui |
| `Sc` | 196 | oui |
| `PO` | 122 | oui |
| `Qo` | 116 | oui |
| `Pm` | 92 | oui |
| `PG` | 76 | oui |
| `Qc` | 70 | oui |
| `PJ` | 53 | oui |
| `PZ` | 53 | oui |
| `BT` | 45 | oui |
| `OA` | 28 | oui |
| `Pj` | 25 | oui |
| `WE` | 18 | oui |
| `QF` | 16 | oui |
| `DD` | 12 | oui |
| `SC` | 10 | oui |
| `ST` | 9 | oui |
| `DH` | 4 | oui |
| `SH` | 4 | **non** |
| `DM` | 3 | oui |
| `Sv` | 3 | oui |
| `HA` | 1 | oui |
| `Nf` | 1 | **non** |
| `Pz` | 1 | oui |

Opérateurs : `=` 3304 · `>` 1743 · `!` 895 · `<` 50 · `E` 2

Clés absentes de la table de DATA_SOURCES §4 :

| Clé | Occ. | Exemples |
|---|---:|---|
| `SH` | 4 | `SH>19` · `SH<8` · `SH>7` |
| `Nf` | 1 | `Nf!508` |

Les 10 critères les plus longs :

- quête 470 (617 car.) : `PL>8&((Pm=69207040&(Qc=715\|Qo=4594))\|(Pm=183765002&(Qc=458\|Qo=3147))\|(Pm=183762944&(Qc=461\|Qo=3164))\|(Pm=183769090&(Qc=4`…
- quête 1960 (537 car.) : `(Qf=1841&PG=18&Pm=83886090)\|(Qf=1677&PG=17&Pm=191106052)\|(Qf=1615&PG=16&Pm=192414724)\|(Qf=938&PG=15&Pm=188743681)\|(Qf=71`…
- quête 1938 (393 car.) : `PL>49&((Pm=183764992&PG=1)\|(Pm=183765004&PG=9)\|(Pm=183766016&PG=6)\|(Pm=148637185&PG=16)\|(Pm=183763968&PG=7)\|(Pm=17048576`…
- quête 1445 (252 car.) : `Qf=29\|Qf=30\|Qf=32\|Qf=33\|Qf=34\|Qf=35\|Qf=115\|Qf=116\|Qf=117\|Qf=118\|Qf=119\|Qf=544\|Qf=545\|Qf=546\|Qf=547\|Qf=548\|Qf=549\|Qf=550\|`…
- quête 1329 (229 car.) : `Qf=612&Qf=613&Qf=614&Qf=619&Qf=620&Qf=621&Qf=622&Qf=623&Qf=624&Qf=625&Qf=626&Qf=649&Qf=650&Qf=651&Qf=652&Qf=653&Qf=655&Q`…
- quête 1684 (191 car.) : `(Ps=1\|Ps=2)&Pa>19&(Pr=2\|Pr=3\|Pr=4\|Pr=5\|Pr=6\|Pr=7\|Pr=8\|Pr=9\|Pr=10\|Pr=11\|Pr=13\|Pr=14\|Pr=15\|Pr=16\|Pr=17\|Pr=19\|Pr=20\|Pr=21\|P`…
- quête 1685 (191 car.) : `(Ps=1\|Ps=2)&Pa>19&(Pr=2\|Pr=3\|Pr=4\|Pr=5\|Pr=6\|Pr=7\|Pr=8\|Pr=9\|Pr=10\|Pr=11\|Pr=13\|Pr=14\|Pr=15\|Pr=16\|Pr=17\|Pr=19\|Pr=20\|Pr=21\|P`…
- quête 1686 (191 car.) : `(Ps=1\|Ps=2)&Pa>19&(Pr=2\|Pr=3\|Pr=4\|Pr=5\|Pr=6\|Pr=7\|Pr=8\|Pr=9\|Pr=10\|Pr=11\|Pr=13\|Pr=14\|Pr=15\|Pr=16\|Pr=17\|Pr=19\|Pr=20\|Pr=21\|P`…
- quête 1687 (191 car.) : `(Ps=1\|Ps=2)&Pa>19&(Pr=2\|Pr=3\|Pr=4\|Pr=5\|Pr=6\|Pr=7\|Pr=8\|Pr=9\|Pr=10\|Pr=11\|Pr=13\|Pr=14\|Pr=15\|Pr=16\|Pr=17\|Pr=19\|Pr=20\|Pr=21\|P`…
- quête 1269 (174 car.) : `PL>99&(PJ>16,199\|PJ>41,199\|PJ>28,199\|PJ>65,199\|PJ>15,199\|PJ>11,199\|PJ>60,199\|PJ>11,199\|PJ>11,199\|PJ>11,199\|PJ>11,199\|PJ>`…

### 2.2 Objectifs de succès (`criterion`)

- Total : **8846** (dont 0 vides) · analysés sans erreur : **8846 / 8846** (100.00 %)
- Arguments par atome : jusqu'à 3 · atomes avec un argument alphabétique : 140
- Précédence mélangée (`&` et `|` au même niveau) : **0**

| Clé | Occurrences | Dans la table §4 |
|---|---:|---|
| `OA` | 2157 | oui |
| `Ef` | 1887 | **non** |
| `PL` | 1556 | oui |
| `SC` | 1181 | oui |
| `Qf` | 1076 | oui |
| `EH` | 677 | **non** |
| `BI` | 423 | **non** |
| `EB` | 297 | **non** |
| `Sc` | 266 | oui |
| `Pr` | 180 | oui |
| `EM` | 147 | **non** |
| `QF` | 87 | oui |
| `EI` | 83 | **non** |
| `lB` | 81 | **non** |
| `Oa` | 62 | **non** |
| `PO` | 45 | oui |
| `HD` | 37 | **non** |
| `ES` | 33 | **non** |
| `QQ` | 18 | **non** |
| `EA` | 15 | **non** |
| `NC` | 15 | **non** |
| `Ea` | 14 | **non** |
| `Pm` | 14 | oui |
| `Pa` | 10 | oui |
| `EC` | 6 | **non** |
| `EJ` | 5 | **non** |
| `Kv` | 4 | **non** |
| `Et` | 3 | **non** |
| `ET` | 3 | **non** |
| `Eu` | 3 | **non** |
| `EW` | 3 | **non** |
| `EY` | 3 | **non** |
| `Ez` | 3 | **non** |
| `EZ` | 3 | **non** |
| `HP` | 3 | **non** |
| `NT` | 3 | **non** |
| `ST` | 3 | oui |
| `Qo` | 2 | oui |
| `Eg` | 1 | **non** |

Opérateurs : `=` 5392 · `>` 5014 · `!` 3

Clés absentes de la table de DATA_SOURCES §4 :

| Clé | Occ. | Exemples |
|---|---:|---|
| `Ef` | 1887 | `Ef>2913,0` · `Ef>2893,0` · `Ef>2914,0` |
| `EH` | 677 | `EH>250,0` · `EH>241,0` · `EH>242,0` |
| `BI` | 423 | `BI=85983744` · `BI=85985792` · `BI=85984770` |
| `EB` | 297 | `EB>38,0` · `EB>46,0` · `EB>33,0` |
| `EM` | 147 | `EM>2864,0,d` · `EM>1188,0,d` · `EM>113,0,d` |
| `EI` | 83 | `EI>27734,499` · `EI>27735,499` · `EI>27736,499` |
| `lB` | 81 | `lB=6` · `lB=7` · `lB=8` |
| `Oa` | 62 | `Oa>1336` · `Oa>3999` · `Oa>5999` |
| `HD` | 37 | `HD>33001,0` · `HD>33011,0` · `HD>33063,0` |
| `ES` | 33 | `ES>320,0` · `ES>757,0` · `ES>758,0` |
| `QQ` | 18 | `QQ>9` · `QQ>49` · `QQ>99` |
| `EA` | 15 | `EA>999` · `EA>99` · `EA>9` |
| `NC` | 15 | `NC>1,0` · `NC>1,4` · `NC>1,9` |
| `Ea` | 14 | `Ea>9` · `Ea>99` · `Ea>24` |
| `EC` | 6 | `EC>0,99` · `EC>0,999` · `EC>0,9999` |
| `EJ` | 5 | `EJ>9016,0` · `EJ>9017,0` · `EJ>9018,0` |
| `Kv` | 4 | `Kv>0,EVENT` · `Kv>4,EVENT` · `Kv>14,EVENT` |
| `Et` | 3 | `Et>1,999` · `Et>4,999` · `Et>8,999` |
| `ET` | 3 | `ET>1,999` · `ET>4,999` · `ET>8,999` |
| `Eu` | 3 | `Eu>0,999` · `Eu>0,9999` · `Eu>0,99` |
| `EW` | 3 | `EW>1,499` · `EW>4,499` · `EW>8,499` |
| `EY` | 3 | `EY>1,499` · `EY>4,499` · `EY>8,499` |
| `Ez` | 3 | `Ez>1,99` · `Ez>4,99` · `Ez>8,99` |
| `EZ` | 3 | `EZ>4,499` · `EZ>1,499` · `EZ>8,499` |
| `HP` | 3 | `HP=1,1` |
| `NT` | 3 | `NT>9` · `NT>99` · `NT>999` |
| `Eg` | 1 | `Eg>9021,9` |

Les 10 critères les plus longs :

- succès 1213, objectif 3766 (173 car.) : `(Pr=2\|Pr=3\|Pr=4\|Pr=5\|Pr=6\|Pr=7\|Pr=8\|Pr=9\|Pr=10\|Pr=11\|Pr=13\|Pr=14\|Pr=15\|Pr=16\|Pr=17\|Pr=19\|Pr=20\|Pr=21\|Pr=22\|Pr=23\|Pr=24\|P`…
- succès 1392, objectif 4336 (173 car.) : `(Pr=2\|Pr=3\|Pr=4\|Pr=5\|Pr=6\|Pr=7\|Pr=8\|Pr=9\|Pr=10\|Pr=11\|Pr=13\|Pr=14\|Pr=15\|Pr=16\|Pr=17\|Pr=19\|Pr=20\|Pr=21\|Pr=22\|Pr=23\|Pr=24\|P`…
- succès 7804, objectif 16116 (151 car.) : `lB=6\|lB=7\|lB=8\|lB=9\|lB=10\|lB=16\|lB=17\|lB=18\|lB=20\|lB=21\|lB=27\|lB=28\|lB=29\|lB=30\|lB=31\|lB=36\|lB=37\|lB=38\|lB=39\|lB=40\|lB=4`…
- succès 1678, objectif 5371 (150 car.) : `(Qf=1841\|Qf=1677\|Qf=1615\|Qf=938\|Qf=716\|Qf=704\|Qf=1974\|Qf=1973\|Qf=1972\|Qf=1971\|Qf=1970\|Qf=1969\|Qf=1968\|Qf=1967\|Qf=1966\|Qf`…
- succès 1214, objectif 3768 (139 car.) : `(Pr=3\|Pr=4\|Pr=5\|Pr=6\|Pr=8\|Pr=9\|Pr=10\|Pr=11\|Pr=14\|Pr=15\|Pr=16\|Pr=17\|Pr=20\|Pr=21\|Pr=22\|Pr=23\|Pr=25\|Pr=26\|Pr=27\|Pr=28\|Pr=30`…
- succès 1393, objectif 4339 (139 car.) : `(Pr=3\|Pr=4\|Pr=5\|Pr=6\|Pr=8\|Pr=9\|Pr=10\|Pr=11\|Pr=14\|Pr=15\|Pr=16\|Pr=17\|Pr=20\|Pr=21\|Pr=22\|Pr=23\|Pr=25\|Pr=26\|Pr=27\|Pr=28\|Pr=30`…
- succès 5938, objectif 13176 (133 car.) : `(EI>27974,0\|EI>28285,0\|EI>27982,0\|EI>27987,0\|EI>27983,0\|EI>27984,0\|EI>27985,0\|EI>27967,0\|EI>27968,0\|EI>27969,0\|EI>27970,`…
- succès 7805, objectif 16117 (125 car.) : `lB=16\|lB=17\|lB=18\|lB=20\|lB=21\|lB=27\|lB=28\|lB=29\|lB=30\|lB=31\|lB=36\|lB=37\|lB=38\|lB=39\|lB=40\|lB=42\|lB=43\|lB=44\|lB=45\|lB=46\|`…
- succès 1215, objectif 3770 (105 car.) : `(Pr=4\|Pr=5\|Pr=6\|Pr=9\|Pr=10\|Pr=11\|Pr=15\|Pr=16\|Pr=17\|Pr=21\|Pr=22\|Pr=23\|Pr=26\|Pr=27\|Pr=28\|Pr=31\|Pr=32\|Pr=33)`
- succès 1394, objectif 4342 (105 car.) : `(Pr=4\|Pr=5\|Pr=6\|Pr=9\|Pr=10\|Pr=11\|Pr=15\|Pr=16\|Pr=17\|Pr=21\|Pr=22\|Pr=23\|Pr=26\|Pr=27\|Pr=28\|Pr=31\|Pr=32\|Pr=33)`

### 2.3 Critères d'objet (`criterions`)

- Total : **317** (dont 0 vides) · analysés sans erreur : **317 / 317** (100.00 %)
- Arguments par atome : jusqu'à 2 · atomes avec un argument alphabétique : 0
- Précédence mélangée (`&` et `|` au même niveau) : **0**

| Clé | Occurrences | Dans la table §4 |
|---|---:|---|
| `Qo` | 247 | oui |
| `Pm` | 100 | oui |
| `PO` | 52 | oui |
| `Qa` | 34 | oui |
| `PB` | 33 | **non** |
| `HA` | 8 | oui |
| `Qf` | 7 | oui |
| `PJ` | 6 | oui |
| `BI` | 5 | **non** |
| `cw` | 4 | **non** |
| `Pj` | 4 | oui |
| `PL` | 3 | oui |
| `Ps` | 3 | oui |
| `Qc` | 3 | oui |
| `CA` | 2 | **non** |
| `CC` | 2 | **non** |
| `CI` | 2 | **non** |
| `CS` | 2 | **non** |
| `cv` | 2 | **non** |
| `ha` | 2 | **non** |
| `Ot` | 2 | **non** |
| `Pn` | 2 | **non** |
| `PT` | 2 | **non** |
| `PZ` | 2 | oui |
| `Sc` | 2 | oui |
| `CM` | 1 | **non** |
| `CP` | 1 | **non** |
| `OH` | 1 | **non** |
| `Pa` | 1 | oui |
| `PC` | 1 | **non** |
| `PG` | 1 | oui |
| `Po` | 1 | **non** |
| `Pz` | 1 | oui |

Opérateurs : `=` 437 · `!` 52 · `>` 33 · `<` 14 · `E` 3

Clés absentes de la table de DATA_SOURCES §4 :

| Clé | Occ. | Exemples |
|---|---:|---|
| `PB` | 33 | `PB=600` · `PB=601` · `PB=602` |
| `BI` | 5 | `BI=1` |
| `cw` | 4 | `cw<25` · `cw<50` · `cw<80` |
| `CA` | 2 | `CA>199` · `CA>249` |
| `CC` | 2 | `CC>199` · `CC>249` |
| `CI` | 2 | `CI>199` · `CI>249` |
| `CS` | 2 | `CS>199` · `CS>249` |
| `cv` | 2 | `cv<100` · `cv<10` |
| `ha` | 2 | `ha!45` · `ha!49` |
| `Ot` | 2 | `Ot!303` · `Ot!306` |
| `Pn` | 2 | `Pn!27` · `Pn!26` |
| `PT` | 2 | `PT=413` |
| `CM` | 1 | `CM<6` |
| `CP` | 1 | `CP<12` |
| `OH` | 1 | `OH!51` |
| `PC` | 1 | `PC=231` |
| `Po` | 1 | `Po!45` |

Les 10 critères les plus longs :

- objet 17672 (143 car.) : `(Pm=160956416&Qo=10520)\|(Pm=160958464&Qo=10525)\|(Pm=160956417&Qo=10528)\|(Pm=160957953&Qo=10535)\|(Pm=160957442&Qo=10542)\|`…
- objet 21705 (58 car.) : `(Pm=88605706\|Pm=88604680\|Pm=88605702\|Pm=88606722)&Qo=15610`
- objet 17074 (57 car.) : `Pm=154141187&Qo=10070&PO!16894&PO!16895&PO!16896&PO!16897`
- objet 19133 (54 car.) : `Pm=206832130&((Qo>12916&Qo=12917)\|(Qo>12939&Qo=12940))`
- objet 1698 (52 car.) : `PJ>2,40\|PJ>24,40\|PJ>36,40\|PJ>28,40\|PJ>26,40\|PJ>41,40`
- objet 15633 (51 car.) : `PB=813&PO=15629&PO=15630&PO=15631&PO=15632&PO!15628`
- objet 19675 (51 car.) : `Pm=188484106\|Pm=188484104\|Pm=188485128\|Pm=188484108`
- objet 12971 (49 car.) : `PL>59&(PB=759\|PB=321\|PB=320\|PB=760\|PB=758\|PB=757)`
- objet 23021 (49 car.) : `Qo=16277&(Pm=207619080\|Pm=207621128\|Pm=207623176)`
- objet 11994 (48 car.) : `(PB=600\|PB=601\|PB=602\|PB=604\|PB=615)&Pm!54167842`

### 2.4 Conditions des récompenses de succès (`criterions`)

- Total : **1108** (dont 0 vides) · analysés sans erreur : **1108 / 1108** (100.00 %)
- Arguments par atome : jusqu'à 1 · atomes avec un argument alphabétique : 0
- Précédence mélangée (`&` et `|` au même niveau) : **0**

| Clé | Occurrences | Dans la table §4 |
|---|---:|---|
| `Ob` | 1062 | **non** |
| `PL` | 122 | oui |
| `SC` | 12 | oui |
| `ST` | 4 | oui |
| `PO` | 1 | oui |

Opérateurs : `!` 1067 · `<` 61 · `>` 61 · `=` 12

Clés absentes de la table de DATA_SOURCES §4 :

| Clé | Occ. | Exemples |
|---|---:|---|
| `Ob` | 1062 | `Ob!14` · `Ob!15` · `Ob!16` |

Les 10 critères les plus longs :

- succès 1052, récompense 1974 (23 car.) : `(SC=0\|(SC=5&ST!7)\|SC=4)`
- succès 1053, récompense 1975 (23 car.) : `(SC=0\|(SC=5&ST!7)\|SC=4)`
- succès 5935, récompense 9250 (23 car.) : `(SC=0\|(SC=5&ST!7)\|SC=4)`
- succès 5936, récompense 9253 (23 car.) : `(SC=0\|(SC=5&ST!7)\|SC=4)`
- succès 2099, récompense 6249 (21 car.) : `PL>109&PL<180&Ob!2099`
- succès 2100, récompense 6254 (21 car.) : `PL>109&PL<190&Ob!2099`
- succès 975, récompense 1878 (20 car.) : `PL>100&PL<151&Ob!975`
- succès 975, récompense 1879 (20 car.) : `PL>150&PL<201&Ob!975`
- succès 976, récompense 1874 (20 car.) : `PL>100&PL<151&Ob!976`
- succès 976, récompense 1875 (20 car.) : `PL>150&PL<201&Ob!976`

## 3. Types d'objectifs de quête

| typeId | Libellé | Occurrences | Compilé en |
|---:|---|---:|---|
| 0 | #1 | 5669 | `other` |
| 1 | Aller voir #1 | 4212 | `talkTo` |
| 3 | Ramener à #1 : x#3 #2 | 2146 | `bringItem` |
| 4 | Découvrir la carte : #1 | 873 | `goTo` |
| 9 | Retourner voir #1 | 798 | `talkTo` |
| 6 | Vaincre x#2 #1 en un seul combat | 788 | `killMonster` |
| 12 | Rapporter #3 âme de #2 à #1. | 363 | `bringSoul` |
| 2 | Montrer à #1 : #3 #2 | 323 | `showItem` |
| 14 | Vaincre x#2 #1 | 143 | `killMonster` |
| 17 | Fabriquer #2 #1 et fermer l'interface | 109 | `craft` |
| 16 | Vaincre x#2 #1 sur la carte #3 en un seul combat | 88 | `killMonster` |
| 10 | Escorter #1 #2 | 26 | `other` |
| 5 | Découvrir la zone #1 | 5 | `goTo` |

Objectifs : **15543** · part typée : **63.36 %** (le reste est compilé en `other` avec son texte).

## 4. Références orphelines (ID cité, absent du snapshot)

- Quêtes et succès cités par des critères : aucun
- Objets : 3 (20763, 27068, 29338)
- Monstres : 12 (7678, 7679, 7680, 7681, 7682, 7683, 7687, 7688, 7689, 7690, 7691, 7700)
- PNJ : 22 (6777, 7123, 7173, 7174, 7175, 7181, 7186, 7187, 7188, 7189, 7190, 7191, …)
- Objectifs de succès listés mais absents en amont : 322

## 5. Oracle `need` de DofusDB

Comparaison, nœud par nœud, entre nos prérequis directs (arêtes obligatoires et alternatives du graphe) et les listes `need.quests` / `need.achievements` précalculées par DofusDB.

- Nœuds comparés (au moins un prérequis d'un côté) : **1956**
- Identiques : **1800** (92.02 %)
- Avec des prérequis chez nous seulement : 30 · chez DofusDB seulement : 126

- quête 318 : chez nous seulement [q:333] · chez DofusDB seulement []
- quête 319 : chez nous seulement [q:317] · chez DofusDB seulement []
- quête 421 : chez nous seulement [q:120] · chez DofusDB seulement []
- quête 422 : chez nous seulement [q:123] · chez DofusDB seulement []
- quête 423 : chez nous seulement [q:121] · chez DofusDB seulement []
- quête 424 : chez nous seulement [q:124] · chez DofusDB seulement []
- quête 425 : chez nous seulement [q:122] · chez DofusDB seulement []
- quête 426 : chez nous seulement [q:125] · chez DofusDB seulement []
- quête 495 : chez nous seulement [] · chez DofusDB seulement [q:890]
- quête 496 : chez nous seulement [] · chez DofusDB seulement [q:890]
- quête 497 : chez nous seulement [] · chez DofusDB seulement [q:890]
- quête 498 : chez nous seulement [] · chez DofusDB seulement [q:890]

## 6. Avertissements de compilation

- objet Dofus 7754 « Dofus Ocre » sans source : absent du catalogue
- objet Dofus 8072 « Dofus Kaliptus » sans source : absent du catalogue
- objet Dofus 20833 « Dofus Cacao » sans source : absent du catalogue
- objet Dofus 20987 « Dofus Cacao » sans source : absent du catalogue
- objet Dofus 21186 « Dofus Vulbis » sans source : absent du catalogue
- objet Dofus 27803 « Dom de Pin » sans source : absent du catalogue
- objet Dofus 29134 « Dofus Sylvestre » sans source : absent du catalogue
- objet Dofus 29135 « Dofus Verdoyant » sans source : absent du catalogue
- objet Dofus 30356 « Jyfus » sans source : absent du catalogue

## 6 bis. Overrides devenus inutiles

Aucun.

## 7. Poids des fichiers de `public/data/`

| Fichier | Brut (octets) | gzip (octets) |
|---|---:|---:|
| quests.json | 3509955 | 355149 |
| achievements.json | 2210581 | 227607 |
| items.json | 927452 | 123221 |
| monsters.json | 485997 | 49805 |
| dungeons.json | 30218 | 6530 |
| refs.json | 112984 | 32243 |
| goals.json | 2919 | 549 |
| **Total** | **7280106** | **795104** |

Cible SPEC §11 : ≤ 1500000 octets gzip pour le premier plan → **respectée** (53.01 % de la cible, tous fichiers confondus).

