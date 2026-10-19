# Töri témazáró – Magyarország története 1526–1711

Interaktív tananyag a 11.B témazárójához.

**Élő oldal:** https://kujab-fazekas.github.io/tori-temazaro-1526-1711/

## Mi van benne

- **5 fejezet** a tanári vázlatok (11B_01–05) alapján, a vázlatok kérdőjeles pontjaival együtt
- **Fejezetzáró kérdések** (begépelős és feleletválasztós, elgépelés-tűrő ellenőrzéssel)
- **6 kötelező forrás** (+ a tordai törvény): tér, idő, szerző, jegyzet, elemzés, kérdések
- **8 esszétéma**: vázlat, kötelező fogalmak és évszámok, íróedzés időzítővel és kulcsszó-ellenőrzéssel
- **Az október 19-i összefoglaló lap** mind a 47 kérdése, megoldókulccsal
- **Térkép** (felfedezés és „hol van?” kvíz), **idővonal**, **időrend-játék**, **szókártyák**, **fogalomtár**
- A „Hibáim” lista a rossz válaszokat addig kérdezi, amíg kétszer jól nem felelsz

A haladást a böngésző tárolja (localStorage), szerver nincs.

## Szerkezet

```
index.html          az oldal váza
css/style.css       megjelenés
js/app.js           az alkalmazás logikája
js/data/c1–c5.js    a fejezetek tartalma és kérdései
js/data/sources.js  a kötelező források
js/data/essays.js   az esszétémák
js/data/sheet.js    az összefoglaló lap
js/data/misc.js     idővonal és térkép
```

Új kérdés felvétele: a megfelelő `js/data/cN.js` fájl `quiz` tömbjébe egy `{q:'kérdés', a:['válasz','másik elfogadott alak'], x:'magyarázat'}` sor.
