-- Migration generated on 2025-10-03T14:32:10.023Z
-- Old file: C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\documents\archive\versenyszamok_0.xlsx
-- New file: C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\documents\versenyszamok.xlsx
-- Summary: 6 inserts, 377 updates

BEGIN TRANSACTION;

-- ========================================
-- INSERT NEW RACES
-- ========================================

-- Insert age groups (ignore if already exist)
INSERT OR IGNORE INTO age_groups (name) VALUES ('Gyermek - U10');
INSERT OR IGNORE INTO age_groups (name) VALUES ('Gyermek - U11');
INSERT OR IGNORE INTO age_groups (name) VALUES ('Gyermek - U12');
INSERT OR IGNORE INTO age_groups (name) VALUES ('Kölyök - U13');
INSERT OR IGNORE INTO age_groups (name) VALUES ('Kölyök - U14');
INSERT OR IGNORE INTO age_groups (name) VALUES ('Serdülő - U16');
INSERT OR IGNORE INTO age_groups (name) VALUES ('Szabadidős és Egyetemi - 19-34 éves szabadidős');
INSERT OR IGNORE INTO age_groups (name) VALUES ('U23 - U19-23');

-- Insert new races (OR IGNORE for idempotency)
INSERT OR IGNORE INTO races (name, discipline, boat_class, gender, distance, occurrence, hidden)
VALUES ('C1 Férfi Serdülő U16 200m', 'Kenu', 'Kenu egyes', 'Férfi', '200 m', 446, 0);

INSERT OR IGNORE INTO races (name, discipline, boat_class, gender, distance, occurrence, hidden)
VALUES ('C4 Mix U23 500 m', 'Kenu', 'Kenu négyes', 'Vegyes', '500 m', 80, 0);

INSERT OR IGNORE INTO races (name, discipline, boat_class, gender, distance, occurrence, hidden)
VALUES ('MC1 Vegyes Gyermek U10-U12 3X200 m Váltó (rossz)', 'Kenu', 'Minikenu egyes', 'Vegyes', '2000 m', 14, 0);

INSERT OR IGNORE INTO races (name, discipline, boat_class, gender, distance, occurrence, hidden)
VALUES ('MK2 Férfi Kölyök U13 500 m', 'Kajak', 'Minikajak páros', 'Férfi', '500 m', 10, 0);

INSERT OR IGNORE INTO races (name, discipline, boat_class, gender, distance, occurrence, hidden)
VALUES ('C2 Vegyes Kölyök U13-U14 1000 m', 'Kenu', 'Kenu páros', 'Vegyes', '1000 m', 8, 0);

INSERT OR IGNORE INTO races (name, discipline, boat_class, gender, distance, occurrence, hidden)
VALUES ('K1 Női Szabadidős és Egyetemi 5 km', 'Kajak', 'Kajak egyes', 'Vegyes', '5 km', 1, 0);

-- Link new races to boat classes by name
UPDATE races SET boat_class_id = (SELECT id FROM boat_classes WHERE name = 'Kenu egyes')
WHERE name = 'C1 Férfi Serdülő U16 200m';

UPDATE races SET boat_class_id = (SELECT id FROM boat_classes WHERE name = 'Kenu négyes')
WHERE name = 'C4 Mix U23 500 m';

UPDATE races SET boat_class_id = (SELECT id FROM boat_classes WHERE name = 'Minikenu egyes')
WHERE name = 'MC1 Vegyes Gyermek U10-U12 3X200 m Váltó (rossz)';

UPDATE races SET boat_class_id = (SELECT id FROM boat_classes WHERE name = 'Minikajak páros')
WHERE name = 'MK2 Férfi Kölyök U13 500 m';

UPDATE races SET boat_class_id = (SELECT id FROM boat_classes WHERE name = 'Kenu páros')
WHERE name = 'C2 Vegyes Kölyök U13-U14 1000 m';

UPDATE races SET boat_class_id = (SELECT id FROM boat_classes WHERE name = 'Kajak egyes')
WHERE name = 'K1 Női Szabadidős és Egyetemi 5 km';

-- Link new races to age groups (OR IGNORE for idempotency)
INSERT OR IGNORE INTO race_age_groups (race_id, age_group_id)
SELECT r.id, ag.id FROM races r, age_groups ag
WHERE r.name = 'C1 Férfi Serdülő U16 200m' AND ag.name = 'Serdülő - U16';

INSERT OR IGNORE INTO race_age_groups (race_id, age_group_id)
SELECT r.id, ag.id FROM races r, age_groups ag
WHERE r.name = 'C4 Mix U23 500 m' AND ag.name = 'U23 - U19-23';

INSERT OR IGNORE INTO race_age_groups (race_id, age_group_id)
SELECT r.id, ag.id FROM races r, age_groups ag
WHERE r.name = 'MC1 Vegyes Gyermek U10-U12 3X200 m Váltó (rossz)' AND ag.name = 'Gyermek - U10';

INSERT OR IGNORE INTO race_age_groups (race_id, age_group_id)
SELECT r.id, ag.id FROM races r, age_groups ag
WHERE r.name = 'MC1 Vegyes Gyermek U10-U12 3X200 m Váltó (rossz)' AND ag.name = 'Gyermek - U11';

INSERT OR IGNORE INTO race_age_groups (race_id, age_group_id)
SELECT r.id, ag.id FROM races r, age_groups ag
WHERE r.name = 'MC1 Vegyes Gyermek U10-U12 3X200 m Váltó (rossz)' AND ag.name = 'Gyermek - U12';

INSERT OR IGNORE INTO race_age_groups (race_id, age_group_id)
SELECT r.id, ag.id FROM races r, age_groups ag
WHERE r.name = 'MK2 Férfi Kölyök U13 500 m' AND ag.name = 'Kölyök - U13';

INSERT OR IGNORE INTO race_age_groups (race_id, age_group_id)
SELECT r.id, ag.id FROM races r, age_groups ag
WHERE r.name = 'C2 Vegyes Kölyök U13-U14 1000 m' AND ag.name = 'Kölyök - U14';

INSERT OR IGNORE INTO race_age_groups (race_id, age_group_id)
SELECT r.id, ag.id FROM races r, age_groups ag
WHERE r.name = 'C2 Vegyes Kölyök U13-U14 1000 m' AND ag.name = 'Kölyök - U13';

INSERT OR IGNORE INTO race_age_groups (race_id, age_group_id)
SELECT r.id, ag.id FROM races r, age_groups ag
WHERE r.name = 'K1 Női Szabadidős és Egyetemi 5 km' AND ag.name = 'Szabadidős és Egyetemi - 19-34 éves szabadidős';

-- ========================================
-- UPDATE EXISTING RACES (OCCURRENCE CHANGED)
-- ========================================

-- K1 Férfi Ifjúsági U17-U18. 500m: 2029 → 6452
UPDATE races SET occurrence = 6452 WHERE name = 'K1 Férfi Ifjúsági U17-U18. 500m';

-- K1 Férfi Ifjúsági U17-U18 1000 m: 6126 → 6162
UPDATE races SET occurrence = 6162 WHERE name = 'K1 Férfi Ifjúsági U17-U18 1000 m';

-- K1 Férfi Kölyök U14. 1000m: 5397 → 5385
UPDATE races SET occurrence = 5385 WHERE name = 'K1 Férfi Kölyök U14. 1000m';

-- MK1 Férfi Gyermek U12 2000 m: 4857 → 5061
UPDATE races SET occurrence = 5061 WHERE name = 'MK1 Férfi Gyermek U12 2000 m';

-- K1 Férfi Serdülő U15. 1000m: 4916 → 4943
UPDATE races SET occurrence = 4943 WHERE name = 'K1 Férfi Serdülő U15. 1000m';

-- MK1 Férfi Gyermek U11 2000 m: 3832 → 3943
UPDATE races SET occurrence = 3943 WHERE name = 'MK1 Férfi Gyermek U11 2000 m';

-- MK1 Férfi Kölyök U13 2000 m: 3605 → 3642
UPDATE races SET occurrence = 3642 WHERE name = 'MK1 Férfi Kölyök U13 2000 m';

-- K1 Férfi Serdülő U16. 1000m: 3595 → 3614
UPDATE races SET occurrence = 3614 WHERE name = 'K1 Férfi Serdülő U16. 1000m';

-- K1 Férfi Kölyök U14 2000 m: 3358 → 3566
UPDATE races SET occurrence = 3566 WHERE name = 'K1 Férfi Kölyök U14 2000 m';

-- K2 Férfi Ifjúsági U17-U18 500 m: 3478 → 3493
UPDATE races SET occurrence = 3493 WHERE name = 'K2 Férfi Ifjúsági U17-U18 500 m';

-- K1 Női Ifjúsági U17-U18 500 m: 3448 → 3455
UPDATE races SET occurrence = 3455 WHERE name = 'K1 Női Ifjúsági U17-U18 500 m';

-- K1 Férfi Ifjúsági U17-U18. 200m: 3236 → 3296
UPDATE races SET occurrence = 3296 WHERE name = 'K1 Férfi Ifjúsági U17-U18. 200m';

-- K1 Férfi Serdülő U15. 500m: 3136 → 3140
UPDATE races SET occurrence = 3140 WHERE name = 'K1 Férfi Serdülő U15. 500m';

-- MK2 Férfi Gyermek U12 2000 m: 2991 → 3065
UPDATE races SET occurrence = 3065 WHERE name = 'MK2 Férfi Gyermek U12 2000 m';

-- MK1 Női Gyermek U12 2000 m: 2926 → 3017
UPDATE races SET occurrence = 3017 WHERE name = 'MK1 Női Gyermek U12 2000 m';

-- K1 Férfi Kölyök U13. 2000m: 2832 → 2977
UPDATE races SET occurrence = 2977 WHERE name = 'K1 Férfi Kölyök U13. 2000m';

-- MK1 Férfi Gyermek U10 2000 m: 2858 → 2967
UPDATE races SET occurrence = 2967 WHERE name = 'MK1 Férfi Gyermek U10 2000 m';

-- K1 Női Serdülő U15. 500m: 2620 → 2622
UPDATE races SET occurrence = 2622 WHERE name = 'K1 Női Serdülő U15. 500m';

-- K1 Férfi Serdülő U16. 500m: 2531 → 2538
UPDATE races SET occurrence = 2538 WHERE name = 'K1 Férfi Serdülő U16. 500m';

-- K1 Férfi Serdülő U15 2000 m: 2420 → 2533
UPDATE races SET occurrence = 2533 WHERE name = 'K1 Férfi Serdülő U15 2000 m';

-- C1 Férfi Ifjúsági U17-U18 500 m: 2478 → 2487
UPDATE races SET occurrence = 2487 WHERE name = 'C1 Férfi Ifjúsági U17-U18 500 m';

-- K1 Női Ifjúsági U17-U18 1000 m: 2477 → 2483
UPDATE races SET occurrence = 2483 WHERE name = 'K1 Női Ifjúsági U17-U18 1000 m';

-- C1 Férfi Ifjúsági U17-U18 1000 m: 2463 → 2467
UPDATE races SET occurrence = 2467 WHERE name = 'C1 Férfi Ifjúsági U17-U18 1000 m';

-- K4 Férfi Serdülő U15-U16. 1000m: 2283 → 2288
UPDATE races SET occurrence = 2288 WHERE name = 'K4 Férfi Serdülő U15-U16. 1000m';

-- MK1 Női Gyermek U11 2000 m: 2217 → 2279
UPDATE races SET occurrence = 2279 WHERE name = 'MK1 Női Gyermek U11 2000 m';

-- K2 Női Ifjúsági U17-U18. 500m: 2215 → 2219
UPDATE races SET occurrence = 2219 WHERE name = 'K2 Női Ifjúsági U17-U18. 500m';

-- MK2 Férfi Gyermek U10-U11 2000 m: 2040 → 2164
UPDATE races SET occurrence = 2164 WHERE name = 'MK2 Férfi Gyermek U10-U11 2000 m';

-- K2 Férfi Ifjúsági U17-U18. 1000m: 3087 → 2160
UPDATE races SET occurrence = 2160 WHERE name = 'K2 Férfi Ifjúsági U17-U18. 1000m';

-- MK1 Női Kölyök U13 2000 m: 2092 → 2118
UPDATE races SET occurrence = 2118 WHERE name = 'MK1 Női Kölyök U13 2000 m';

-- K1 Férfi Serdülő U16 2000 m: 1943 → 2041
UPDATE races SET occurrence = 2041 WHERE name = 'K1 Férfi Serdülő U16 2000 m';

-- K1 Női Serdülő U16. 500m: 1989 → 1990
UPDATE races SET occurrence = 1990 WHERE name = 'K1 Női Serdülő U16. 500m';

-- K1 Férfi U23 500m: 1902 → 1903
UPDATE races SET occurrence = 1903 WHERE name = 'K1 Férfi U23 500m';

-- MK2 Női Gyermek U12 2000 m: 1848 → 1886
UPDATE races SET occurrence = 1886 WHERE name = 'MK2 Női Gyermek U12 2000 m';

-- K1 Női Kölyök U14 2000 m: 1796 → 1876
UPDATE races SET occurrence = 1876 WHERE name = 'K1 Női Kölyök U14 2000 m';

-- K1 Férfi Masters 500 m: 1797 → 1805
UPDATE races SET occurrence = 1805 WHERE name = 'K1 Férfi Masters 500 m';

-- C1 Férfi Serdülő U15 1000m: 1761 → 1768
UPDATE races SET occurrence = 1768 WHERE name = 'C1 Férfi Serdülő U15 1000m';

-- K1 Női Kölyök U13 2000 m: 1656 → 1745
UPDATE races SET occurrence = 1745 WHERE name = 'K1 Női Kölyök U13 2000 m';

-- K1 Férfi Ifjúsági U17-U18. 1000m: 1727 → 1726
UPDATE races SET occurrence = 1726 WHERE name = 'K1 Férfi Ifjúsági U17-U18. 1000m';

-- MK1 Női Gyermek U10 2000 m: 1594 → 1658
UPDATE races SET occurrence = 1658 WHERE name = 'MK1 Női Gyermek U10 2000 m';

-- K4 Férfi Ifjúsági U17-U18. 500m: 1641 → 1645
UPDATE races SET occurrence = 1645 WHERE name = 'K4 Férfi Ifjúsági U17-U18. 500m';

-- K2 Férfi Serdülő U16. 500m: 1593 → 1590
UPDATE races SET occurrence = 1590 WHERE name = 'K2 Férfi Serdülő U16. 500m';

-- K2 Férfi Kölyök U14. 1000m: 1551 → 1572
UPDATE races SET occurrence = 1572 WHERE name = 'K2 Férfi Kölyök U14. 1000m';

-- K2 Férfi Kölyök U13-U14 1000 m: 1507 → 1549
UPDATE races SET occurrence = 1549 WHERE name = 'K2 Férfi Kölyök U13-U14 1000 m';

-- K2 Férfi Masters 500 m: 1523 → 1527
UPDATE races SET occurrence = 1527 WHERE name = 'K2 Férfi Masters 500 m';

-- K2 Férfi Serdülő U15-U16 500 m: 1456 → 1488
UPDATE races SET occurrence = 1488 WHERE name = 'K2 Férfi Serdülő U15-U16 500 m';

-- K1 Női Ifjúsági U17-U18 200 m: 1442 → 1465
UPDATE races SET occurrence = 1465 WHERE name = 'K1 Női Ifjúsági U17-U18 200 m';

-- K1 Férfi Serdülő U16. 200m: 1330 → 1418
UPDATE races SET occurrence = 1418 WHERE name = 'K1 Férfi Serdülő U16. 200m';

-- K4 Férfi Felnőtt 200m: 1371 → 1372
UPDATE races SET occurrence = 1372 WHERE name = 'K4 Férfi Felnőtt 200m';

-- K4 Férfi Ifjúsági U17-U18. 1000m: 1351 → 1348
UPDATE races SET occurrence = 1348 WHERE name = 'K4 Férfi Ifjúsági U17-U18. 1000m';

-- C1 Férfi Serdülő U16 1000m: 1335 → 1341
UPDATE races SET occurrence = 1341 WHERE name = 'C1 Férfi Serdülő U16 1000m';

-- MK4 Férfi Kölyök U13. 2000m: 1334 → 1335
UPDATE races SET occurrence = 1335 WHERE name = 'MK4 Férfi Kölyök U13. 2000m';

-- K1 Férfi Serdülő U15-U16. 3x200m: 1315 → 1313
UPDATE races SET occurrence = 1313 WHERE name = 'K1 Férfi Serdülő U15-U16. 3x200m';

-- K4 Férfi Felnőtt 500m: 1305 → 1313
UPDATE races SET occurrence = 1313 WHERE name = 'K4 Férfi Felnőtt 500m';

-- MK4 Férfi Gyermek U12 2000m: 1291 → 1285
UPDATE races SET occurrence = 1285 WHERE name = 'MK4 Férfi Gyermek U12 2000m';

-- K1 Női Serdülő U15 1000 m: 1236 → 1246
UPDATE races SET occurrence = 1246 WHERE name = 'K1 Női Serdülő U15 1000 m';

-- K1 Férfi U23 1000m: 1238 → 1242
UPDATE races SET occurrence = 1242 WHERE name = 'K1 Férfi U23 1000m';

-- K2 Női Serdülő U15-U16. 500m: 1225 → 1239
UPDATE races SET occurrence = 1239 WHERE name = 'K2 Női Serdülő U15-U16. 500m';

-- C2 Férfi Ifjúsági U17-U18. 500m: 1233 → 1237
UPDATE races SET occurrence = 1237 WHERE name = 'C2 Férfi Ifjúsági U17-U18. 500m';

-- K1 Női Serdülő U15 2000 m: 1160 → 1217
UPDATE races SET occurrence = 1217 WHERE name = 'K1 Női Serdülő U15 2000 m';

-- K2 Férfi Kölyök U14. 2000m: 1141 → 1195
UPDATE races SET occurrence = 1195 WHERE name = 'K2 Férfi Kölyök U14. 2000m';

-- K2 Férfi Kölyök U13-U14 500 m: 1177 → 1190
UPDATE races SET occurrence = 1190 WHERE name = 'K2 Férfi Kölyök U13-U14 500 m';

-- C1 Férfi Kölyök U13 2000 m: 1144 → 1163
UPDATE races SET occurrence = 1163 WHERE name = 'C1 Férfi Kölyök U13 2000 m';

-- K1 Férfi Ifjúsági U17-U18 2000 m: 1094 → 1161
UPDATE races SET occurrence = 1161 WHERE name = 'K1 Férfi Ifjúsági U17-U18 2000 m';

-- K1 Férfi felnőtt 500m: 1144 → 1146
UPDATE races SET occurrence = 1146 WHERE name = 'K1 Férfi felnőtt 500m';

-- C2 Férfi Ifjúsági U17-U18. 1000m: 1141 → 1145
UPDATE races SET occurrence = 1145 WHERE name = 'C2 Férfi Ifjúsági U17-U18. 1000m';

-- MK2 Női Gyermek U10-U11 2000 m: 1039 → 1095
UPDATE races SET occurrence = 1095 WHERE name = 'MK2 Női Gyermek U10-U11 2000 m';

-- K4 Férfi Kölyök U13-U14 1000 m: 1096 → 1090
UPDATE races SET occurrence = 1090 WHERE name = 'K4 Férfi Kölyök U13-U14 1000 m';

-- K1 Férfi Kölyök IV. 1000m: 1074 → 1072
UPDATE races SET occurrence = 1072 WHERE name = 'K1 Férfi Kölyök IV. 1000m';

-- K2 Férfi U23 500m: 1067 → 1070
UPDATE races SET occurrence = 1070 WHERE name = 'K2 Férfi U23 500m';

-- K2 Női Kölyök U13-U14 1000 m: 1042 → 1058
UPDATE races SET occurrence = 1058 WHERE name = 'K2 Női Kölyök U13-U14 1000 m';

-- K2 Férfi Felnőtt 500 m: 1029 → 1033
UPDATE races SET occurrence = 1033 WHERE name = 'K2 Férfi Felnőtt 500 m';

-- K1 Férfi U23 200m: 1020 → 1021
UPDATE races SET occurrence = 1021 WHERE name = 'K1 Férfi U23 200m';

-- MK1 Férfi Gyermek U12 5 km: 1015 → 1014
UPDATE races SET occurrence = 1014 WHERE name = 'MK1 Férfi Gyermek U12 5 km';

-- C1 Férfi Serdülő U15 500m: 1008 → 1010
UPDATE races SET occurrence = 1010 WHERE name = 'C1 Férfi Serdülő U15 500m';

-- MK4 Férfi Gyermek U10-U12. 2000 m: 998 → 999
UPDATE races SET occurrence = 999 WHERE name = 'MK4 Férfi Gyermek U10-U12. 2000 m';

-- MK1 Férfi Gyermek U12 4X200 m váltó: 984 → 983
UPDATE races SET occurrence = 983 WHERE name = 'MK1 Férfi Gyermek U12 4X200 m váltó';

-- K1 Női Serdülő U16. 1000m: 943 → 951
UPDATE races SET occurrence = 951 WHERE name = 'K1 Női Serdülő U16. 1000m';

-- K2 Férfi Ifjúsági U17-U18. 1000m: 3087 → 943
UPDATE races SET occurrence = 943 WHERE name = 'K2 Férfi Ifjúsági U17-U18. 1000m';

-- K1 Férfi Kölyök U14 10 km: 933 → 927
UPDATE races SET occurrence = 927 WHERE name = 'K1 Férfi Kölyök U14 10 km';

-- K1 Női Felnőtt 500 m: 924 → 926
UPDATE races SET occurrence = 926 WHERE name = 'K1 Női Felnőtt 500 m';

-- TC4 Vegyes Gyermek U10-U12 2000 m: 915 → 919
UPDATE races SET occurrence = 919 WHERE name = 'TC4 Vegyes Gyermek U10-U12 2000 m';

-- MK1 Férfi Gyermek I. 2000m: 916 → 919
UPDATE races SET occurrence = 919 WHERE name = 'MK1 Férfi Gyermek I. 2000m';

-- C2 Férfi Serdülő U15-U16 500 m: 902 → 910
UPDATE races SET occurrence = 910 WHERE name = 'C2 Férfi Serdülő U15-U16 500 m';

-- C1 Férfi Kölyök U14 1000 m: 920 → 908
UPDATE races SET occurrence = 908 WHERE name = 'C1 Férfi Kölyök U14 1000 m';

-- C1 Női Ifjúsági U17-U18 200 m: 902 → 906
UPDATE races SET occurrence = 906 WHERE name = 'C1 Női Ifjúsági U17-U18 200 m';

-- K4 Férfi Serdülő U15-U16. 2000m: 888 → 889
UPDATE races SET occurrence = 889 WHERE name = 'K4 Férfi Serdülő U15-U16. 2000m';

-- K1 Női Serdülő U16 2000 m: 854 → 883
UPDATE races SET occurrence = 883 WHERE name = 'K1 Női Serdülő U16 2000 m';

-- K2 Női Kölyök U14. 1000m: 880 → 882
UPDATE races SET occurrence = 882 WHERE name = 'K2 Női Kölyök U14. 1000m';

-- C1 Férfi Kölyök U14 2000 m: 869 → 880
UPDATE races SET occurrence = 880 WHERE name = 'C1 Férfi Kölyök U14 2000 m';

-- C1 Férfi Serdülő U16 500m: 849 → 851
UPDATE races SET occurrence = 851 WHERE name = 'C1 Férfi Serdülő U16 500m';

-- MK1 Férfi Kölyök U13 10 km: 856 → 846
UPDATE races SET occurrence = 846 WHERE name = 'MK1 Férfi Kölyök U13 10 km';

-- K4 Férfi U23 200m: 839 → 838
UPDATE races SET occurrence = 838 WHERE name = 'K4 Férfi U23 200m';

-- K2 Férfi U23 200m: 837 → 838
UPDATE races SET occurrence = 838 WHERE name = 'K2 Férfi U23 200m';

-- K1 Férfi Kölyök U14. 3x200m: 806 → 807
UPDATE races SET occurrence = 807 WHERE name = 'K1 Férfi Kölyök U14. 3x200m';

-- K1 Férfi Serdülő U15 200 m: 725 → 804
UPDATE races SET occurrence = 804 WHERE name = 'K1 Férfi Serdülő U15 200 m';

-- K2 Férfi Kölyök U13. 2000m: 784 → 801
UPDATE races SET occurrence = 801 WHERE name = 'K2 Férfi Kölyök U13. 2000m';

-- K2 Férfi U23 1000m: 796 → 799
UPDATE races SET occurrence = 799 WHERE name = 'K2 Férfi U23 1000m';

-- K1 Férfi Felnőtt 1000 m: 796 → 798
UPDATE races SET occurrence = 798 WHERE name = 'K1 Férfi Felnőtt 1000 m';

-- K1 Női Serdülő U16. 200m: 772 → 797
UPDATE races SET occurrence = 797 WHERE name = 'K1 Női Serdülő U16. 200m';

-- K1 Női U23 500m: 789 → 791
UPDATE races SET occurrence = 791 WHERE name = 'K1 Női U23 500m';

-- C1 Férfi U23 500 m: 778 → 780
UPDATE races SET occurrence = 780 WHERE name = 'C1 Férfi U23 500 m';

-- MK1 Férfi Kölyök U13 3x200m: 777 → 779
UPDATE races SET occurrence = 779 WHERE name = 'MK1 Férfi Kölyök U13 3x200m';

-- K4 Női Ifjúsági U17-U18. 500m: 764 → 772
UPDATE races SET occurrence = 772 WHERE name = 'K4 Női Ifjúsági U17-U18. 500m';

-- K2 Női Ifjúsági U17-U18. 1000m: 770 → 772
UPDATE races SET occurrence = 772 WHERE name = 'K2 Női Ifjúsági U17-U18. 1000m';

-- MK2 Férfi Gyermek U11 2000m: 775 → 769
UPDATE races SET occurrence = 769 WHERE name = 'MK2 Férfi Gyermek U11 2000m';

-- C1 Női Ifjúsági U17-U18 500 m: 763 → 768
UPDATE races SET occurrence = 768 WHERE name = 'C1 Női Ifjúsági U17-U18 500 m';

-- K4 Férfi U23 500m: 740 → 749
UPDATE races SET occurrence = 749 WHERE name = 'K4 Férfi U23 500m';

-- C1 Férfi Felnőtt 1000 m: 747 → 749
UPDATE races SET occurrence = 749 WHERE name = 'C1 Férfi Felnőtt 1000 m';

-- MK1 Férfi Gyermek U10-U11 4x200m: 739 → 736
UPDATE races SET occurrence = 736 WHERE name = 'MK1 Férfi Gyermek U10-U11 4x200m';

-- MK1 Férfi Gyermek U11 5 km: 745 → 727
UPDATE races SET occurrence = 727 WHERE name = 'MK1 Férfi Gyermek U11 5 km';

-- MK2 Férfi Gyermek I. 2000m: 711 → 712
UPDATE races SET occurrence = 712 WHERE name = 'MK2 Férfi Gyermek I. 2000m';

-- MK4 Férfi Gyermek U10-U12 2000 m: 712 → 711
UPDATE races SET occurrence = 711 WHERE name = 'MK4 Férfi Gyermek U10-U12 2000 m';

-- MK1 Férfi Kölyök U13. 3X200m váltó: 721 → 711
UPDATE races SET occurrence = 711 WHERE name = 'MK1 Férfi Kölyök U13. 3X200m váltó';

-- C1 Férfi Masters 500 m: 694 → 697
UPDATE races SET occurrence = 697 WHERE name = 'C1 Férfi Masters 500 m';

-- PC4 Vegyes Gyermek U10-U12 2000 m: 680 → 696
UPDATE races SET occurrence = 696 WHERE name = 'PC4 Vegyes Gyermek U10-U12 2000 m';

-- C1 Férfi Serdülő U15 2000 m: 680 → 684
UPDATE races SET occurrence = 684 WHERE name = 'C1 Férfi Serdülő U15 2000 m';

-- MK2 Férfi Gyermek U12 5 km: 672 → 669
UPDATE races SET occurrence = 669 WHERE name = 'MK2 Férfi Gyermek U12 5 km';

-- K1 Férfi Ifjúsági U17-U18 21 km (síkvíz): 664 → 666
UPDATE races SET occurrence = 666 WHERE name = 'K1 Férfi Ifjúsági U17-U18 21 km (síkvíz)';

-- K1 Női Ifjúsági U17-U18 2000 m: 627 → 659
UPDATE races SET occurrence = 659 WHERE name = 'K1 Női Ifjúsági U17-U18 2000 m';

-- C2 Férfi Serdülő U15-U16 1000m: 645 → 649
UPDATE races SET occurrence = 649 WHERE name = 'C2 Férfi Serdülő U15-U16 1000m';

-- PC2 Mix Gyermek U10-U12 2000 m: 629 → 643
UPDATE races SET occurrence = 643 WHERE name = 'PC2 Mix Gyermek U10-U12 2000 m';

-- K2 Férfi Ifjúsági U17-U18 22 km: 632 → 634
UPDATE races SET occurrence = 634 WHERE name = 'K2 Férfi Ifjúsági U17-U18 22 km';

-- K2 Női Kölyök U14. 2000m: 612 → 632
UPDATE races SET occurrence = 632 WHERE name = 'K2 Női Kölyök U14. 2000m';

-- K2 Férfi Kölyök U14 10 km: 629 → 630
UPDATE races SET occurrence = 630 WHERE name = 'K2 Férfi Kölyök U14 10 km';

-- MK2 Férfi Gyermek II. 2000m: 632 → 630
UPDATE races SET occurrence = 630 WHERE name = 'MK2 Férfi Gyermek II. 2000m';

-- C1 Férfi U23 1000m: 619 → 621
UPDATE races SET occurrence = 621 WHERE name = 'C1 Férfi U23 1000m';

-- C2 Női Serdülő U15-U16. 500m: 613 → 619
UPDATE races SET occurrence = 619 WHERE name = 'C2 Női Serdülő U15-U16. 500m';

-- C1 Férfi U23 200 m: 609 → 611
UPDATE races SET occurrence = 611 WHERE name = 'C1 Férfi U23 200 m';

-- K2 Női U23 500m: 600 → 604
UPDATE races SET occurrence = 604 WHERE name = 'K2 Női U23 500m';

-- MK4 Férfi Gyermek U10-U11 1000 m: 607 → 604
UPDATE races SET occurrence = 604 WHERE name = 'MK4 Férfi Gyermek U10-U11 1000 m';

-- MC1 Férfi Gyermek U12 2000 m: 563 → 591
UPDATE races SET occurrence = 591 WHERE name = 'MC1 Férfi Gyermek U12 2000 m';

-- K4 Mix Ifjúsági U17-U18 500 m: 588 → 590
UPDATE races SET occurrence = 590 WHERE name = 'K4 Mix Ifjúsági U17-U18 500 m';

-- K1 Női U23 1000m: 586 → 588
UPDATE races SET occurrence = 588 WHERE name = 'K1 Női U23 1000m';

-- K1 Női U23 200m: 575 → 577
UPDATE races SET occurrence = 577 WHERE name = 'K1 Női U23 200m';

-- MK4 Férfi Gyermek U12 1000 m: 583 → 572
UPDATE races SET occurrence = 572 WHERE name = 'MK4 Férfi Gyermek U12 1000 m';

-- K1 Női Felnőtt 200 m: 569 → 571
UPDATE races SET occurrence = 571 WHERE name = 'K1 Női Felnőtt 200 m';

-- K1 Férfi Serdülő U15-U16. 3X200m váltó: 534 → 541
UPDATE races SET occurrence = 541 WHERE name = 'K1 Férfi Serdülő U15-U16. 3X200m váltó';

-- MK2 Férfi Gyermek U10 2000 m: 512 → 536
UPDATE races SET occurrence = 536 WHERE name = 'MK2 Férfi Gyermek U10 2000 m';

-- K1 Férfi Ifjúsági U17-U18. 3x200m: 539 → 536
UPDATE races SET occurrence = 536 WHERE name = 'K1 Férfi Ifjúsági U17-U18. 3x200m';

-- K2 Férfi Kölyök IV. 1000m: 534 → 533
UPDATE races SET occurrence = 533 WHERE name = 'K2 Férfi Kölyök IV. 1000m';

-- C4 Férfi Felnőtt 500m: 526 → 530
UPDATE races SET occurrence = 530 WHERE name = 'C4 Férfi Felnőtt 500m';

-- MK4 Férfi Gyermek U11 2000 m: 534 → 528
UPDATE races SET occurrence = 528 WHERE name = 'MK4 Férfi Gyermek U11 2000 m';

-- K2 Férfi Ifjúsági U17-U18. 200m: 528 → 526
UPDATE races SET occurrence = 526 WHERE name = 'K2 Férfi Ifjúsági U17-U18. 200m';

-- K2 Női Felnőtt 500 m: 516 → 520
UPDATE races SET occurrence = 520 WHERE name = 'K2 Női Felnőtt 500 m';

-- MK1 Férfi Gyermek II. 4x500m váltó: 518 → 516
UPDATE races SET occurrence = 516 WHERE name = 'MK1 Férfi Gyermek II. 4x500m váltó';

-- C2 Női Ifjúsági U17-U18. 500m: 614 → 512
UPDATE races SET occurrence = 512 WHERE name = 'C2 Női Ifjúsági U17-U18. 500m';

-- C2 Férfi U23 500m: 507 → 511
UPDATE races SET occurrence = 511 WHERE name = 'C2 Férfi U23 500m';

-- MK1 Férfi Kölyök III. 3x200m váltó: 506 → 504
UPDATE races SET occurrence = 504 WHERE name = 'MK1 Férfi Kölyök III. 3x200m váltó';

-- K1 Férfi Serdülő U15 4000m: 493 → 500
UPDATE races SET occurrence = 500 WHERE name = 'K1 Férfi Serdülő U15 4000m';

-- C1 Női Serdülő U15-U16 2000 m: 489 → 500
UPDATE races SET occurrence = 500 WHERE name = 'C1 Női Serdülő U15-U16 2000 m';

-- MK1 Férfi Gyermek U10 5 km: 487 → 484
UPDATE races SET occurrence = 484 WHERE name = 'MK1 Férfi Gyermek U10 5 km';

-- K1 Férfi Kölyök IV. 3x200m váltó: 482 → 480
UPDATE races SET occurrence = 480 WHERE name = 'K1 Férfi Kölyök IV. 3x200m váltó';

-- K1 Férfi Serdülő U15-U16 2000 m: 231 → 480
UPDATE races SET occurrence = 480 WHERE name = 'K1 Férfi Serdülő U15-U16 2000 m';

-- C1 Férfi Serdülő U16 2000 m: 471 → 473
UPDATE races SET occurrence = 473 WHERE name = 'C1 Férfi Serdülő U16 2000 m';

-- C1 Férfi felnőtt 500 m: 458 → 460
UPDATE races SET occurrence = 460 WHERE name = 'C1 Férfi felnőtt 500 m';

-- K1 Férfi Ifjúsági U17-U18 22 km: 446 → 448
UPDATE races SET occurrence = 448 WHERE name = 'K1 Férfi Ifjúsági U17-U18 22 km';

-- MK1 Férfi Kölyök III. 2000m: 447 → 446
UPDATE races SET occurrence = 446 WHERE name = 'MK1 Férfi Kölyök III. 2000m';

-- MK4 Férfi Kölyök U13 1000 m: 457 → 444
UPDATE races SET occurrence = 444 WHERE name = 'MK4 Férfi Kölyök U13 1000 m';

-- C2 Férfi U23 1000m: 437 → 439
UPDATE races SET occurrence = 439 WHERE name = 'C2 Férfi U23 1000m';

-- C1 Női Felnőtt 200 m: 437 → 439
UPDATE races SET occurrence = 439 WHERE name = 'C1 Női Felnőtt 200 m';

-- K2 Női Kölyök U13. 2000m: 422 → 438
UPDATE races SET occurrence = 438 WHERE name = 'K2 Női Kölyök U13. 2000m';

-- K2 Férfi Serdülő U15-U16 1000 m: 422 → 437
UPDATE races SET occurrence = 437 WHERE name = 'K2 Férfi Serdülő U15-U16 1000 m';

-- PC2 Vegyes Kölyök U13 2000 m: 431 → 435
UPDATE races SET occurrence = 435 WHERE name = 'PC2 Vegyes Kölyök U13 2000 m';

-- K1 Férfi Szabadidős és Egyetemista 500m: 431 → 432
UPDATE races SET occurrence = 432 WHERE name = 'K1 Férfi Szabadidős és Egyetemista 500m';

-- C1 Férfi Ifjúsági U17-U18 2000 m: 409 → 417
UPDATE races SET occurrence = 417 WHERE name = 'C1 Férfi Ifjúsági U17-U18 2000 m';

-- C1 Női Kölyök U13-U14 2000 m: 388 → 411
UPDATE races SET occurrence = 411 WHERE name = 'C1 Női Kölyök U13-U14 2000 m';

-- K1 Férfi Kölyök IV. 4000m: 411 → 409
UPDATE races SET occurrence = 409 WHERE name = 'K1 Férfi Kölyök IV. 4000m';

-- MK2 Férfi Kölyök U13 2000 m: 393 → 407
UPDATE races SET occurrence = 407 WHERE name = 'MK2 Férfi Kölyök U13 2000 m';

-- K2 Férfi Serdülő U15-U16 2000 m: 322 → 400
UPDATE races SET occurrence = 400 WHERE name = 'K2 Férfi Serdülő U15-U16 2000 m';

-- MK1 Vegyes Gyermek U10-U11 4x200m: 402 → 398
UPDATE races SET occurrence = 398 WHERE name = 'MK1 Vegyes Gyermek U10-U11 4x200m';

-- K1 Férfi Kölyök U13-U14. 2000m (Zebra szerint): 397 → 394
UPDATE races SET occurrence = 394 WHERE name = 'K1 Férfi Kölyök U13-U14. 2000m (Zebra szerint)';

-- K4 Női U23 500m: 384 → 392
UPDATE races SET occurrence = 392 WHERE name = 'K4 Női U23 500m';

-- K1 Férfi Kölyök U13 10 km: 394 → 391
UPDATE races SET occurrence = 391 WHERE name = 'K1 Férfi Kölyök U13 10 km';

-- MK1 Férfi Kölyök III. 4000m: 391 → 389
UPDATE races SET occurrence = 389 WHERE name = 'MK1 Férfi Kölyök III. 4000m';

-- MK1 Férfi Gyermek I. 4x500m váltó: 385 → 387
UPDATE races SET occurrence = 387 WHERE name = 'MK1 Férfi Gyermek I. 4x500m váltó';

-- C2 Férfi felnőtt 500 m: 380 → 384
UPDATE races SET occurrence = 384 WHERE name = 'C2 Férfi felnőtt 500 m';

-- MK2 Női Gyermek U11 2000 m: 374 → 376
UPDATE races SET occurrence = 376 WHERE name = 'MK2 Női Gyermek U11 2000 m';

-- K1 Női Serdülő U15 200 m: 333 → 370
UPDATE races SET occurrence = 370 WHERE name = 'K1 Női Serdülő U15 200 m';

-- K1 Női Masters 500 m: 363 → 364
UPDATE races SET occurrence = 364 WHERE name = 'K1 Női Masters 500 m';

-- C1 Férfi Ifjúsági U17-U18 200 m: 340 → 344
UPDATE races SET occurrence = 344 WHERE name = 'C1 Férfi Ifjúsági U17-U18 200 m';

-- MK1 Férfi Előkészítő U8-U9 500 m: 306 → 341
UPDATE races SET occurrence = 341 WHERE name = 'MK1 Férfi Előkészítő U8-U9 500 m';

-- MK1 Férfi Gyermek U10-U11 2000 m: 281 → 339
UPDATE races SET occurrence = 339 WHERE name = 'MK1 Férfi Gyermek U10-U11 2000 m';

-- MK4 Mix Gyermek U10-U11 1000 m: 335 → 332
UPDATE races SET occurrence = 332 WHERE name = 'MK4 Mix Gyermek U10-U11 1000 m';

-- PC2 Férfi Kölyök U13 2000 m: 326 → 328
UPDATE races SET occurrence = 328 WHERE name = 'PC2 Férfi Kölyök U13 2000 m';

-- MC1 Férfi Gyermek U10-U11 2000 m: 302 → 313
UPDATE races SET occurrence = 313 WHERE name = 'MC1 Férfi Gyermek U10-U11 2000 m';

-- K1 Női felnőtt 1000m: 311 → 313
UPDATE races SET occurrence = 313 WHERE name = 'K1 Női felnőtt 1000m';

-- K2 Férfi Kölyök U13-U14 2000 m: 278 → 312
UPDATE races SET occurrence = 312 WHERE name = 'K2 Férfi Kölyök U13-U14 2000 m';

-- MK2 Férfi Gyermek U10-U12 2000 m: 262 → 312
UPDATE races SET occurrence = 312 WHERE name = 'MK2 Férfi Gyermek U10-U12 2000 m';

-- MK4 Férfi Gyermek U10 2000 m: 313 → 312
UPDATE races SET occurrence = 312 WHERE name = 'MK4 Férfi Gyermek U10 2000 m';

-- MK4 Vegyes Gyermek U11-U12 2000 m: 252 → 308
UPDATE races SET occurrence = 308 WHERE name = 'MK4 Vegyes Gyermek U11-U12 2000 m';

-- C4 Férfi U23 500 m: 301 → 305
UPDATE races SET occurrence = 305 WHERE name = 'C4 Férfi U23 500 m';

-- K2 Mix Ifjúsági U17-U18 200 m: 174 → 300
UPDATE races SET occurrence = 300 WHERE name = 'K2 Mix Ifjúsági U17-U18 200 m';

-- K2 Férfi Kölyök U13 10 km: 296 → 297
UPDATE races SET occurrence = 297 WHERE name = 'K2 Férfi Kölyök U13 10 km';

-- C2 Férfi Kölyök U13-U14 2000 m: 282 → 296
UPDATE races SET occurrence = 296 WHERE name = 'C2 Férfi Kölyök U13-U14 2000 m';

-- K1 Férfi Serdülő U15. 200m: 298 → 296
UPDATE races SET occurrence = 296 WHERE name = 'K1 Férfi Serdülő U15. 200m';

-- C1 Női felnőtt 500 m: 289 → 291
UPDATE races SET occurrence = 291 WHERE name = 'C1 Női felnőtt 500 m';

-- K4 Férfi Ifjúsági U17-U18. 4000m: 291 → 290
UPDATE races SET occurrence = 290 WHERE name = 'K4 Férfi Ifjúsági U17-U18. 4000m';

-- C1 Férfi Kölyök U14 10 km: 291 → 288
UPDATE races SET occurrence = 288 WHERE name = 'C1 Férfi Kölyök U14 10 km';

-- C2 Női Ifjúsági U17-U18. 200m: 376 → 282
UPDATE races SET occurrence = 282 WHERE name = 'C2 Női Ifjúsági U17-U18. 200m';

-- K1 Férfi Felnőtt 5000 m: 276 → 278
UPDATE races SET occurrence = 278 WHERE name = 'K1 Férfi Felnőtt 5000 m';

-- K4 Női felnőtt 500m: 268 → 276
UPDATE races SET occurrence = 276 WHERE name = 'K4 Női felnőtt 500m';

-- C2 Női Kölyök U13-U14 1000 m: 273 → 275
UPDATE races SET occurrence = 275 WHERE name = 'C2 Női Kölyök U13-U14 1000 m';

-- C1 Női Serdülő U15-U16 200 m: 270 → 275
UPDATE races SET occurrence = 275 WHERE name = 'C1 Női Serdülő U15-U16 200 m';

-- K1 Férfi Ifjúsági U18-U17 22Km Síkvízi: 277 → 275
UPDATE races SET occurrence = 275 WHERE name = 'K1 Férfi Ifjúsági U18-U17 22Km Síkvízi';

-- K4 Férfi Serdülő U15-U16. 4000m: 276 → 274
UPDATE races SET occurrence = 274 WHERE name = 'K4 Férfi Serdülő U15-U16. 4000m';

-- K1 Férfi Kölyök U13 4000 m: 271 → 272
UPDATE races SET occurrence = 272 WHERE name = 'K1 Férfi Kölyök U13 4000 m';

-- C2 Női Felnőtt 500 m: 260 → 264
UPDATE races SET occurrence = 264 WHERE name = 'C2 Női Felnőtt 500 m';

-- C2 Férfi Serdülő U15-U16 2000 m: 260 → 262
UPDATE races SET occurrence = 262 WHERE name = 'C2 Férfi Serdülő U15-U16 2000 m';

-- C1 Férfi felnőtt 200 m: 256 → 258
UPDATE races SET occurrence = 258 WHERE name = 'C1 Férfi felnőtt 200 m';

-- C1 Női Kölyök U13 2000 m: 242 → 245
UPDATE races SET occurrence = 245 WHERE name = 'C1 Női Kölyök U13 2000 m';

-- MK1 Férfi Előkészítő U8-U9 (akadálypálya): 224 → 243
UPDATE races SET occurrence = 243 WHERE name = 'MK1 Férfi Előkészítő U8-U9 (akadálypálya)';

-- C1 Női U23 500m: 237 → 239
UPDATE races SET occurrence = 239 WHERE name = 'C1 Női U23 500m';

-- C4 Férfi Ifjúsági U17-U18. 500m: 233 → 237
UPDATE races SET occurrence = 237 WHERE name = 'C4 Férfi Ifjúsági U17-U18. 500m';

-- C1 Női U23 200m: 235 → 237
UPDATE races SET occurrence = 237 WHERE name = 'C1 Női U23 200m';

-- K2 Férfi Kölyök U13. 4000m: 236 → 237
UPDATE races SET occurrence = 237 WHERE name = 'K2 Férfi Kölyök U13. 4000m';

-- K1 Női Serdülő U15-U16. 3X200m váltó: 230 → 236
UPDATE races SET occurrence = 236 WHERE name = 'K1 Női Serdülő U15-U16. 3X200m váltó';

-- K1 Férfi Ifjúsági U17-U18 5000 m: 219 → 221
UPDATE races SET occurrence = 221 WHERE name = 'K1 Férfi Ifjúsági U17-U18 5000 m';

-- C1 Női Serdülő U15 500 m: 213 → 215
UPDATE races SET occurrence = 215 WHERE name = 'C1 Női Serdülő U15 500 m';

-- K1 Férfi U23 5000m: 212 → 213
UPDATE races SET occurrence = 213 WHERE name = 'K1 Férfi U23 5000m';

-- K1 Férfi Ifjúsági U17 2000 m: 212 → 213
UPDATE races SET occurrence = 213 WHERE name = 'K1 Férfi Ifjúsági U17 2000 m';

-- C1 Férfi Kölyök U13 10 km: 214 → 213
UPDATE races SET occurrence = 213 WHERE name = 'C1 Férfi Kölyök U13 10 km';

-- MK2 Női Kölyök U13 2000 m: 204 → 212
UPDATE races SET occurrence = 212 WHERE name = 'MK2 Női Kölyök U13 2000 m';

-- C1 Női Serdülő U16 500 m: 207 → 209
UPDATE races SET occurrence = 209 WHERE name = 'C1 Női Serdülő U16 500 m';

-- MK2 Férfi Kölyök U13 10 km: 214 → 208
UPDATE races SET occurrence = 208 WHERE name = 'MK2 Férfi Kölyök U13 10 km';

-- MK1 Férfi Kölyök III. 10Km: 203 → 202
UPDATE races SET occurrence = 202 WHERE name = 'MK1 Férfi Kölyök III. 10Km';

-- K2 Mix Kölyök U13-U14 2000 m: 158 → 202
UPDATE races SET occurrence = 202 WHERE name = 'K2 Mix Kölyök U13-U14 2000 m';

-- C2 Női U23 500m: 196 → 200
UPDATE races SET occurrence = 200 WHERE name = 'C2 Női U23 500m';

-- MK1 Férfi Kölyök U13 5 km: 200 → 197
UPDATE races SET occurrence = 197 WHERE name = 'MK1 Férfi Kölyök U13 5 km';

-- MK2 Női Gyermek U10 2000 m: 194 → 196
UPDATE races SET occurrence = 196 WHERE name = 'MK2 Női Gyermek U10 2000 m';

-- K1 Férfi Kölyök U13-U14 2000 m: 157 → 186
UPDATE races SET occurrence = 186 WHERE name = 'K1 Férfi Kölyök U13-U14 2000 m';

-- K1 Férfi Kölyök U13-U14 3X200 m Váltó: 143 → 179
UPDATE races SET occurrence = 179 WHERE name = 'K1 Férfi Kölyök U13-U14 3X200 m Váltó';

-- K1 Női Serdülő U15-U16 2000 m: 168 → 177
UPDATE races SET occurrence = 177 WHERE name = 'K1 Női Serdülő U15-U16 2000 m';

-- MC1 Női Gyermek U10-U12 2000 m: 174 → 176
UPDATE races SET occurrence = 176 WHERE name = 'MC1 Női Gyermek U10-U12 2000 m';

-- PC2 Vegyes Gyermek U10-U12 2000 m: 144 → 166
UPDATE races SET occurrence = 166 WHERE name = 'PC2 Vegyes Gyermek U10-U12 2000 m';

-- C1 Férfi Szabadidős és Egyetemista 500m: 162 → 163
UPDATE races SET occurrence = 163 WHERE name = 'C1 Férfi Szabadidős és Egyetemista 500m';

-- MK1 Női Gyermek U10-U11 2000 m: 132 → 161
UPDATE races SET occurrence = 161 WHERE name = 'MK1 Női Gyermek U10-U11 2000 m';

-- MK1 Női Előkészítő U8-U9 500 m: 146 → 159
UPDATE races SET occurrence = 159 WHERE name = 'MK1 Női Előkészítő U8-U9 500 m';

-- MC1 Női Gyermek U12 2000 m: 151 → 154
UPDATE races SET occurrence = 154 WHERE name = 'MC1 Női Gyermek U12 2000 m';

-- K1 Férfi Kölyök U13 5 km: 155 → 152
UPDATE races SET occurrence = 152 WHERE name = 'K1 Férfi Kölyök U13 5 km';

-- K4 Vegyes Kölyök U13-U14 2000 m: 104 → 152
UPDATE races SET occurrence = 152 WHERE name = 'K4 Vegyes Kölyök U13-U14 2000 m';

-- C1 Férfi Serdülő U15 200 m: 146 → 151
UPDATE races SET occurrence = 151 WHERE name = 'C1 Férfi Serdülő U15 200 m';

-- K2 Női Serdülő U15-U16 2000 m: 120 → 146
UPDATE races SET occurrence = 146 WHERE name = 'K2 Női Serdülő U15-U16 2000 m';

-- K1 Női felnőtt 5000m: 141 → 143
UPDATE races SET occurrence = 143 WHERE name = 'K1 Női felnőtt 5000m';

-- C2 Női felnőtt 200 m: 136 → 140
UPDATE races SET occurrence = 140 WHERE name = 'C2 Női felnőtt 200 m';

-- C2 Női U23 200m: 138 → 140
UPDATE races SET occurrence = 140 WHERE name = 'C2 Női U23 200m';

-- K2 Férfi Kölyök IV. 10Km: 141 → 140
UPDATE races SET occurrence = 140 WHERE name = 'K2 Férfi Kölyök IV. 10Km';

-- MK2 Mix Gyermek U11-U12 2000 m: 106 → 138
UPDATE races SET occurrence = 138 WHERE name = 'MK2 Mix Gyermek U11-U12 2000 m';

-- C1 Férfi Serdülő U15-U16 2000 m: 124 → 133
UPDATE races SET occurrence = 133 WHERE name = 'C1 Férfi Serdülő U15-U16 2000 m';

-- C1 Férfi Kölyök U13-U14 2000 m: 118 → 131
UPDATE races SET occurrence = 131 WHERE name = 'C1 Férfi Kölyök U13-U14 2000 m';

-- C1 Férfi Serdülő U15-U16 3X200m váltó: 124 → 130
UPDATE races SET occurrence = 130 WHERE name = 'C1 Férfi Serdülő U15-U16 3X200m váltó';

-- KL3 Parakajak Férfi Felnőtt 200 m: 127 → 129
UPDATE races SET occurrence = 129 WHERE name = 'KL3 Parakajak Férfi Felnőtt 200 m';

-- MK1 Férfi Gyermek I. 5Km: 123 → 124
UPDATE races SET occurrence = 124 WHERE name = 'MK1 Férfi Gyermek I. 5Km';

-- MK2 Férfi Előkészítő U8-U9 2000 m: 104 → 124
UPDATE races SET occurrence = 124 WHERE name = 'MK2 Férfi Előkészítő U8-U9 2000 m';

-- MK4 Vegyes Gyermek U10 2000 m: 88 → 124
UPDATE races SET occurrence = 124 WHERE name = 'MK4 Vegyes Gyermek U10 2000 m';

-- MK2 Női Gyermek U10-U12 2000 m: 116 → 122
UPDATE races SET occurrence = 122 WHERE name = 'MK2 Női Gyermek U10-U12 2000 m';

-- C1 Férfi felnőtt 5000 m: 120 → 122
UPDATE races SET occurrence = 122 WHERE name = 'C1 Férfi felnőtt 5000 m';

-- MK4 Vegyes Gyermek I-II. 1000m: 116 → 118
UPDATE races SET occurrence = 118 WHERE name = 'MK4 Vegyes Gyermek I-II. 1000m';

-- MK1 Férfi Gyermek U12 3X200 m Váltó: 99 → 117
UPDATE races SET occurrence = 117 WHERE name = 'MK1 Férfi Gyermek U12 3X200 m Váltó';

-- K1 Férfi Ifjúsági U17-U18 rövid kör (maraton) 3,4 km: 106 → 108
UPDATE races SET occurrence = 108 WHERE name = 'K1 Férfi Ifjúsági U17-U18 rövid kör (maraton) 3,4 km';

-- C2 Női Ifjúsági U17-U18. 500m: 614 → 106
UPDATE races SET occurrence = 106 WHERE name = 'C2 Női Ifjúsági U17-U18. 500m';

-- K1 Férfi Ifjúsági U18 2000 m: 100 → 101
UPDATE races SET occurrence = 101 WHERE name = 'K1 Férfi Ifjúsági U18 2000 m';

-- MC1 Vegyes Gyermek U10-U12 2000 m: 97 → 101
UPDATE races SET occurrence = 101 WHERE name = 'MC1 Vegyes Gyermek U10-U12 2000 m';

-- C4 Mix Ifjúsági U17-U18 500 m: 96 → 100
UPDATE races SET occurrence = 100 WHERE name = 'C4 Mix Ifjúsági U17-U18 500 m';

-- MK1 Férfi Előkészítő U8-U9 szlalom + 200 m: 79 → 100
UPDATE races SET occurrence = 100 WHERE name = 'MK1 Férfi Előkészítő U8-U9 szlalom + 200 m';

-- MC1 Férfi Gyermek U11 2000 m: 90 → 99
UPDATE races SET occurrence = 99 WHERE name = 'MC1 Férfi Gyermek U11 2000 m';

-- C2 Női Ifjúsági U17-U18. 200m: 376 → 98
UPDATE races SET occurrence = 98 WHERE name = 'C2 Női Ifjúsági U17-U18. 200m';

-- C1 Női felnőtt 5000 m: 95 → 97
UPDATE races SET occurrence = 97 WHERE name = 'C1 Női felnőtt 5000 m';

-- K1 Férfi Ifjúsági U17-U18 21 km: 2 → 96
UPDATE races SET occurrence = 96 WHERE name = 'K1 Férfi Ifjúsági U17-U18 21 km';

-- MK1 Férfi Gyermek U10-U11 3X200 m Váltó: 77 → 94
UPDATE races SET occurrence = 94 WHERE name = 'MK1 Férfi Gyermek U10-U11 3X200 m Váltó';

-- MK1 Női Előkészítő U8-U9 (akadálypálya): 86 → 93
UPDATE races SET occurrence = 93 WHERE name = 'MK1 Női Előkészítő U8-U9 (akadálypálya)';

-- MC1 Női Gyermek U10-U11 2000 m: 84 → 91
UPDATE races SET occurrence = 91 WHERE name = 'MC1 Női Gyermek U10-U11 2000 m';

-- K1 Férfi Felnőtt rövid kör (maraton) 3,4 km: 89 → 91
UPDATE races SET occurrence = 91 WHERE name = 'K1 Férfi Felnőtt rövid kör (maraton) 3,4 km';

-- KL1 Parakajak Férfi Felnőtt 200 m: 87 → 90
UPDATE races SET occurrence = 90 WHERE name = 'KL1 Parakajak Férfi Felnőtt 200 m';

-- PC2 Vegyes Előkészítő U8-U9 2000m: 74 → 90
UPDATE races SET occurrence = 90 WHERE name = 'PC2 Vegyes Előkészítő U8-U9 2000m';

-- C2 Mix Kölyök U13-U14 2000 m: 62 → 82
UPDATE races SET occurrence = 82 WHERE name = 'C2 Mix Kölyök U13-U14 2000 m';

-- MK1 Vegyes Gyermek U10-U11. 4x500m: 80 → 82
UPDATE races SET occurrence = 82 WHERE name = 'MK1 Vegyes Gyermek U10-U11. 4x500m';

-- MK2 Vegyes Előkészítő U8-U9 2000 m: 58 → 78
UPDATE races SET occurrence = 78 WHERE name = 'MK2 Vegyes Előkészítő U8-U9 2000 m';

-- K4 Vegyes Serdülő U15-U16 2000 m: 60 → 76
UPDATE races SET occurrence = 76 WHERE name = 'K4 Vegyes Serdülő U15-U16 2000 m';

-- K1 Női Kölyök U13-U14 2000 m: 70 → 75
UPDATE races SET occurrence = 75 WHERE name = 'K1 Női Kölyök U13-U14 2000 m';

-- MK1 Női Előkészítő U8-U9 szlalom + 200 m: 52 → 74
UPDATE races SET occurrence = 74 WHERE name = 'MK1 Női Előkészítő U8-U9 szlalom + 200 m';

-- C1-NK1-K1 Kölyök U13-U14 3x200m vegyes váltó: 37 → 74
UPDATE races SET occurrence = 74 WHERE name = 'C1-NK1-K1 Kölyök U13-U14 3x200m vegyes váltó';

-- K1 Női Kölyök U13-U14 3X200 m Váltó: 63 → 72
UPDATE races SET occurrence = 72 WHERE name = 'K1 Női Kölyök U13-U14 3X200 m Váltó';

-- TC4 Vegyes Előkészítő U8-U9 2000 m: 61 → 69
UPDATE races SET occurrence = 69 WHERE name = 'TC4 Vegyes Előkészítő U8-U9 2000 m';

-- K1 Férfi U23 2000 m: 68 → 69
UPDATE races SET occurrence = 69 WHERE name = 'K1 Férfi U23 2000 m';

-- K2 Női Ifjúsági U17 500 m: 62 → 66
UPDATE races SET occurrence = 66 WHERE name = 'K2 Női Ifjúsági U17 500 m';

-- K1 Női Felnőtt rövid kör (maraton) 3,4 km: 60 → 64
UPDATE races SET occurrence = 64 WHERE name = 'K1 Női Felnőtt rövid kör (maraton) 3,4 km';

-- MK1 Vegyes Előkészítő U8-U9 100 m Ügyességi: 37 → 62
UPDATE races SET occurrence = 62 WHERE name = 'MK1 Vegyes Előkészítő U8-U9 100 m Ügyességi';

-- MK2 Vegyes Gyermek 2000 m U12: 50 → 62
UPDATE races SET occurrence = 62 WHERE name = 'MK2 Vegyes Gyermek 2000 m U12';

-- VL2 Parakenu Férfi Felnőtt 200 m: 59 → 60
UPDATE races SET occurrence = 60 WHERE name = 'VL2 Parakenu Férfi Felnőtt 200 m';

-- KL3 Parakajak Női Felnőtt 200 m: 55 → 56
UPDATE races SET occurrence = 56 WHERE name = 'KL3 Parakajak Női Felnőtt 200 m';

-- K2 Férfi Ifjúsági U17-U18 2000 m: 24 → 54
UPDATE races SET occurrence = 54 WHERE name = 'K2 Férfi Ifjúsági U17-U18 2000 m';

-- PC2 Vegyes Gyermek U10 2000 m: 46 → 50
UPDATE races SET occurrence = 50 WHERE name = 'PC2 Vegyes Gyermek U10 2000 m';

-- KL2 Parakajak Női Felnőtt 200 m: 46 → 48
UPDATE races SET occurrence = 48 WHERE name = 'KL2 Parakajak Női Felnőtt 200 m';

-- K2 Női Serdülő U15-U16 1000 m: 44 → 48
UPDATE races SET occurrence = 48 WHERE name = 'K2 Női Serdülő U15-U16 1000 m';

-- K1 Férfi Ifjúsági U17 500 m: 46 → 48
UPDATE races SET occurrence = 48 WHERE name = 'K1 Férfi Ifjúsági U17 500 m';

-- C1 Női Ifjúsági U17-U18 2000 m: 43 → 45
UPDATE races SET occurrence = 45 WHERE name = 'C1 Női Ifjúsági U17-U18 2000 m';

-- C1 Női Felnőtt rövid kör (maraton) 3,4 km: 42 → 44
UPDATE races SET occurrence = 44 WHERE name = 'C1 Női Felnőtt rövid kör (maraton) 3,4 km';

-- K2 Férfi Ifjúsági U17 1000 m: 40 → 44
UPDATE races SET occurrence = 44 WHERE name = 'K2 Férfi Ifjúsági U17 1000 m';

-- K2 Mix Serdülő U15-U16 2000 m: 34 → 44
UPDATE races SET occurrence = 44 WHERE name = 'K2 Mix Serdülő U15-U16 2000 m';

-- K2 Vegyes Kölyök U13-U14 500 m: 28 → 44
UPDATE races SET occurrence = 44 WHERE name = 'K2 Vegyes Kölyök U13-U14 500 m';

-- C1-NK1-K1 Serdülő U15-U16 3X200m vegyes váltó: 21 → 44
UPDATE races SET occurrence = 44 WHERE name = 'C1-NK1-K1 Serdülő U15-U16 3X200m vegyes váltó';

-- KL2 Parakajak Férfi Felnőtt 200 m: 42 → 44
UPDATE races SET occurrence = 44 WHERE name = 'KL2 Parakajak Férfi Felnőtt 200 m';

-- C1 Férfi Felnőtt rövid kör (maraton) 3,4 km: 43 → 44
UPDATE races SET occurrence = 44 WHERE name = 'C1 Férfi Felnőtt rövid kör (maraton) 3,4 km';

-- MC1 Férfi Gyermek U10 2000 m: 39 → 43
UPDATE races SET occurrence = 43 WHERE name = 'MC1 Férfi Gyermek U10 2000 m';

-- K1 Férfi Ifjúsági U17 1000 m: 40 → 42
UPDATE races SET occurrence = 42 WHERE name = 'K1 Férfi Ifjúsági U17 1000 m';

-- K2 Férfi Ifjúsági U17 500 m: 36 → 40
UPDATE races SET occurrence = 40 WHERE name = 'K2 Férfi Ifjúsági U17 500 m';

-- C2 Férfi Ifjúsági U17 500 m: 36 → 40
UPDATE races SET occurrence = 40 WHERE name = 'C2 Férfi Ifjúsági U17 500 m';

-- K4 Férfi Serdülő U15-U16, Ifjúsági U17 500 m: 32 → 40
UPDATE races SET occurrence = 40 WHERE name = 'K4 Férfi Serdülő U15-U16, Ifjúsági U17 500 m';

-- K1 Női Ifjúsági U17 200 m: 37 → 39
UPDATE races SET occurrence = 39 WHERE name = 'K1 Női Ifjúsági U17 200 m';

-- K1 Női Ifjúsági U17 1000 m: 35 → 37
UPDATE races SET occurrence = 37 WHERE name = 'K1 Női Ifjúsági U17 1000 m';

-- K1 Női Ifjúsági U17 500 m: 35 → 37
UPDATE races SET occurrence = 37 WHERE name = 'K1 Női Ifjúsági U17 500 m';

-- C2 Férfi Ifjúsági U17 1000 m: 34 → 36
UPDATE races SET occurrence = 36 WHERE name = 'C2 Férfi Ifjúsági U17 1000 m';

-- C1 Férfi Ifjúsági U17 500 m: 33 → 35
UPDATE races SET occurrence = 35 WHERE name = 'C1 Férfi Ifjúsági U17 500 m';

-- EK1 Vegyes Előkészítő U8-U9 100 m Ügyességi: 32 → 34
UPDATE races SET occurrence = 34 WHERE name = 'EK1 Vegyes Előkészítő U8-U9 100 m Ügyességi';

-- K1 Férfi Szabadidős és Egyetemi, Masters 2000 m: 29 → 34
UPDATE races SET occurrence = 34 WHERE name = 'K1 Férfi Szabadidős és Egyetemi, Masters 2000 m';

-- C1 Női Serdülő U16 200 m: 32 → 34
UPDATE races SET occurrence = 34 WHERE name = 'C1 Női Serdülő U16 200 m';

-- KL3 Parakajak Férfi Felnőtt 5 km: 24 → 34
UPDATE races SET occurrence = 34 WHERE name = 'KL3 Parakajak Férfi Felnőtt 5 km';

-- C1 Férfi Ifjúsági U17 1000 m: 31 → 33
UPDATE races SET occurrence = 33 WHERE name = 'C1 Férfi Ifjúsági U17 1000 m';

-- C4 Női Ifjúsági U17-U18 500 m: 28 → 32
UPDATE races SET occurrence = 32 WHERE name = 'C4 Női Ifjúsági U17-U18 500 m';

-- C1 Női Serdülő U15 200 m: 30 → 32
UPDATE races SET occurrence = 32 WHERE name = 'C1 Női Serdülő U15 200 m';

-- C1 Női Serdülő U16 2000 m: 29 → 30
UPDATE races SET occurrence = 30 WHERE name = 'C1 Női Serdülő U16 2000 m';

-- K2 Férfi Ifjúsági U17-U18 22,6 km: 26 → 30
UPDATE races SET occurrence = 30 WHERE name = 'K2 Férfi Ifjúsági U17-U18 22,6 km';

-- K1 Női U23 2000 m: 26 → 28
UPDATE races SET occurrence = 28 WHERE name = 'K1 Női U23 2000 m';

-- C2 Női Ifjúsági U17 500 m: 24 → 28
UPDATE races SET occurrence = 28 WHERE name = 'C2 Női Ifjúsági U17 500 m';

-- C4 Női U23 500 m: 24 → 28
UPDATE races SET occurrence = 28 WHERE name = 'C4 Női U23 500 m';

-- K2 Női Ifjúsági U17-U18 19 km: 24 → 28
UPDATE races SET occurrence = 28 WHERE name = 'K2 Női Ifjúsági U17-U18 19 km';

-- C1 Női Ifjúsági U17 500 m: 26 → 27
UPDATE races SET occurrence = 27 WHERE name = 'C1 Női Ifjúsági U17 500 m';

-- K4 Női Serdülő U15-U16, Ifjúsági U17 500 m: 16 → 24
UPDATE races SET occurrence = 24 WHERE name = 'K4 Női Serdülő U15-U16, Ifjúsági U17 500 m';

-- K1 Férfi Felnőtt 2000 m: 20 → 24
UPDATE races SET occurrence = 24 WHERE name = 'K1 Férfi Felnőtt 2000 m';

-- K2 Női Felnőtt 26,2 km: 20 → 24
UPDATE races SET occurrence = 24 WHERE name = 'K2 Női Felnőtt 26,2 km';

-- C2 Női Serdülő U15-U16 200 m: 20 → 24
UPDATE races SET occurrence = 24 WHERE name = 'C2 Női Serdülő U15-U16 200 m';

-- K2 Férfi Kölyök U13 1000 m: 16 → 22
UPDATE races SET occurrence = 22 WHERE name = 'K2 Férfi Kölyök U13 1000 m';

-- K2 Vegyes Serdülő U15-U16 500 m: 18 → 22
UPDATE races SET occurrence = 22 WHERE name = 'K2 Vegyes Serdülő U15-U16 500 m';

-- K2 Női Ifjúsági U17-U18 2000 m: 16 → 22
UPDATE races SET occurrence = 22 WHERE name = 'K2 Női Ifjúsági U17-U18 2000 m';

-- MK2 Vegyes Gyermek U10-U11 2000 m: 12 → 22
UPDATE races SET occurrence = 22 WHERE name = 'MK2 Vegyes Gyermek U10-U11 2000 m';

-- KL2 Parakajak Férfi Felnőtt 5 km: 8 → 21
UPDATE races SET occurrence = 21 WHERE name = 'KL2 Parakajak Férfi Felnőtt 5 km';

-- C2 Női Ifjúsági U17 200 m: 16 → 20
UPDATE races SET occurrence = 20 WHERE name = 'C2 Női Ifjúsági U17 200 m';

-- K2 Férfi Felnőtt 29,8 km: 16 → 20
UPDATE races SET occurrence = 20 WHERE name = 'K2 Férfi Felnőtt 29,8 km';

-- C4 Férfi Serdülő U15-U16, Ifjúsági U17 500 m: 12 → 20
UPDATE races SET occurrence = 20 WHERE name = 'C4 Férfi Serdülő U15-U16, Ifjúsági U17 500 m';

-- K2 Vegyes Ifjúsági U17-U18 500 m: 8 → 18
UPDATE races SET occurrence = 18 WHERE name = 'K2 Vegyes Ifjúsági U17-U18 500 m';

-- C1 Férfi U23 2000 m: 17 → 18
UPDATE races SET occurrence = 18 WHERE name = 'C1 Férfi U23 2000 m';

-- K1 Férfi Ifjúsági U17-U18 22,6 km: 14 → 16
UPDATE races SET occurrence = 16 WHERE name = 'K1 Férfi Ifjúsági U17-U18 22,6 km';

-- C1 Női Ifjúsági U17 200 m: 15 → 16
UPDATE races SET occurrence = 16 WHERE name = 'C1 Női Ifjúsági U17 200 m';

-- C4 Női Felnőtt 500 m: 12 → 16
UPDATE races SET occurrence = 16 WHERE name = 'C4 Női Felnőtt 500 m';

-- K1 Férfi Felnőtt 29,8 km: 14 → 16
UPDATE races SET occurrence = 16 WHERE name = 'K1 Férfi Felnőtt 29,8 km';

-- C1 Férfi Kölyök U14 5 km: 19 → 16
UPDATE races SET occurrence = 16 WHERE name = 'C1 Férfi Kölyök U14 5 km';

-- MC1 Vegyes Gyermek U10-U11 2000 m: 15 → 16
UPDATE races SET occurrence = 16 WHERE name = 'MC1 Vegyes Gyermek U10-U11 2000 m';

-- K1 Női U23 22,6 km: 14 → 16
UPDATE races SET occurrence = 16 WHERE name = 'K1 Női U23 22,6 km';

-- C2 Férfi Ifjúsági U17-U18 15,4 km: 12 → 16
UPDATE races SET occurrence = 16 WHERE name = 'C2 Férfi Ifjúsági U17-U18 15,4 km';

-- C4 Női Serdülő U15-U16, Ifjúsági U17 500 m: 8 → 16
UPDATE races SET occurrence = 16 WHERE name = 'C4 Női Serdülő U15-U16, Ifjúsági U17 500 m';

-- K1 Női Felnőtt 26,2 km: 13 → 15
UPDATE races SET occurrence = 15 WHERE name = 'K1 Női Felnőtt 26,2 km';

-- K1 Férfi U23 26,2 km: 13 → 15
UPDATE races SET occurrence = 15 WHERE name = 'K1 Férfi U23 26,2 km';

-- K1 Női Ifjúsági U17-U18 19 km: 13 → 15
UPDATE races SET occurrence = 15 WHERE name = 'K1 Női Ifjúsági U17-U18 19 km';

-- K1 Női Szabadidős és Egyetemi, Masters 2000 m: 13 → 14
UPDATE races SET occurrence = 14 WHERE name = 'K1 Női Szabadidős és Egyetemi, Masters 2000 m';

-- KL3 Parakajak Női Felnőtt 5 km: 8 → 14
UPDATE races SET occurrence = 14 WHERE name = 'KL3 Parakajak Női Felnőtt 5 km';

-- C1 Női Felnőtt 15,4 km: 11 → 13
UPDATE races SET occurrence = 13 WHERE name = 'C1 Női Felnőtt 15,4 km';

-- C2 Férfi Felnőtt 22,6 km: 8 → 12
UPDATE races SET occurrence = 12 WHERE name = 'C2 Férfi Felnőtt 22,6 km';

-- C2 Mix Ifjúsági U17-U18 200 m: 4 → 12
UPDATE races SET occurrence = 12 WHERE name = 'C2 Mix Ifjúsági U17-U18 200 m';

-- C1 Női Ifjúsági U17-U18 11,8 km: 10 → 12
UPDATE races SET occurrence = 12 WHERE name = 'C1 Női Ifjúsági U17-U18 11,8 km';

-- MK2 Vegyes Előkészítő U8-U9 1000 m (akadálypálya): 4 → 12
UPDATE races SET occurrence = 12 WHERE name = 'MK2 Vegyes Előkészítő U8-U9 1000 m (akadálypálya)';

-- C1 Női Serdülő U15 1000 m: 9 → 11
UPDATE races SET occurrence = 11 WHERE name = 'C1 Női Serdülő U15 1000 m';

-- KL1 Parakajak Férfi Felnőtt 5 km: 6 → 11
UPDATE races SET occurrence = 11 WHERE name = 'KL1 Parakajak Férfi Felnőtt 5 km';

-- K1 Férfi Masters 2000 m: 9 → 11
UPDATE races SET occurrence = 11 WHERE name = 'K1 Férfi Masters 2000 m';

-- K2 Női Kölyök U13 1000 m: 6 → 10
UPDATE races SET occurrence = 10 WHERE name = 'K2 Női Kölyök U13 1000 m';

-- C1 Női Serdülő U16 1000 m: 7 → 8
UPDATE races SET occurrence = 8 WHERE name = 'C1 Női Serdülő U16 1000 m';

-- MC1 Férfi Előkészítő U8-U9  (akadálypálya): 5 → 8
UPDATE races SET occurrence = 8 WHERE name = 'MC1 Férfi Előkészítő U8-U9  (akadálypálya)';

-- C1 Férfi U23 19 km: 5 → 7
UPDATE races SET occurrence = 7 WHERE name = 'C1 Férfi U23 19 km';

-- C1 Férfi Felnőtt 22,6 km: 6 → 7
UPDATE races SET occurrence = 7 WHERE name = 'C1 Férfi Felnőtt 22,6 km';

-- C1 Férfi Ifjúsági U17-U18 15,4 km: 4 → 6
UPDATE races SET occurrence = 6 WHERE name = 'C1 Férfi Ifjúsági U17-U18 15,4 km';

-- C1 váltó Mix Ifjúsági U17-U18 5000 m: 4 → 6
UPDATE races SET occurrence = 6 WHERE name = 'C1 váltó Mix Ifjúsági U17-U18 5000 m';

-- KL2 Parakajak Női Felnőtt 5 km: 1 → 6
UPDATE races SET occurrence = 6 WHERE name = 'KL2 Parakajak Női Felnőtt 5 km';

-- K1 váltó Mix Ifjúsági U17-U18 5000 m: 4 → 6
UPDATE races SET occurrence = 6 WHERE name = 'K1 váltó Mix Ifjúsági U17-U18 5000 m';

-- K1 váltó Mix U23 5000 m: 4 → 6
UPDATE races SET occurrence = 6 WHERE name = 'K1 váltó Mix U23 5000 m';

-- C1 Női U23 11,8 km: 4 → 5
UPDATE races SET occurrence = 5 WHERE name = 'C1 Női U23 11,8 km';

-- C1 váltó Mix U23 5000 m: 2 → 4
UPDATE races SET occurrence = 4 WHERE name = 'C1 váltó Mix U23 5000 m';

-- K1 Női Felnőtt 2000 m: 3 → 4
UPDATE races SET occurrence = 4 WHERE name = 'K1 Női Felnőtt 2000 m';

-- C1 Férfi Kölyök U13 5 km: 2 → 1
UPDATE races SET occurrence = 1 WHERE name = 'C1 Férfi Kölyök U13 5 km';

COMMIT;

-- Migration complete