# Schowek

Schowek to lekka aplikacja działająca w sieci LAN, która umożliwia współdzielenie tekstu i jednego pliku pomiędzy urządzeniami. Wystarczy uruchomić instancję na jednym komputerze, a inne urządzenia w sieci mogą przeglądać i edytować wspólny schowek przez przeglądarkę.

---

## Funkcje

* Współdzielenie tekstu w czasie rzeczywistym (WebSocket)
* Możliwość przesłania jednego pliku (nowy zastępuje poprzedni)
* Prosty interfejs webowy
* Brak logowania – dostępne dla wszystkich w tej samej sieci

---

## Uruchamianie

### Wersja gotowa (zalecana)

#### Windows

```
./schowek-win.exe --port 3000
```

#### Linux

```
./schowek-linux --port 3000
```

Po uruchomieniu odwiedź w przeglądarce: `http://<adres_LAN_komputera>:3000`

### Budowanie samodzielne

Wymaga Node.js oraz `pkg`:

```
git clone <repo>
cd <repo>
npm install
npm run build
```

Pliki wykonywalne pojawią się w katalogu `dist/`:

* `schowek-win.exe`
* `schowek-linux`

---

## Uwaga dotycząca bezpieczeństwa

* Aplikacja nie ma żadnego uwierzytelniania – każdy kto ma dostęp do portu HTTP/WebSocket może czytać i modyfikować schowek.
* Nie należy wystawiać aplikacji bezpośrednio do internetu bez odpowiednich zabezpieczeń (proxy, VPN itp.).

---

## Ograniczenia

* Obsługiwany jest tylko jeden plik naraz – nowy nadpisuje stary
* Plik przechowywany jest w pamięci RAM, nie na dysku
* Maksymalny rozmiar pliku nie został przetestowany

---

## Licencja

Projekt prywatny / wewnętrzny, brak licencji publicznej.
