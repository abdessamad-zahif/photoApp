# Projektdokumentation


## Informationen zur Inbetriebnahme der Anwendung

 ### 1. Voraussetzungen
 Stellen Sie sicher, dass die folgenden Softwarekomponenten auf Ihrem System installiert sind:
 - Java Development Kit (JDK)
 - Maven für die Verwaltung von Dependencies
 - Node.js und npm für das Verwalten der Frontend-Abhängigkeiten
 - MySQL und MariaDB
 - Browser zum Testen der Webanwendung

 ### 2. Datenbank einrichten
 1. Starten Sie den MySQL-Datenbankserver
 2. Erstellen Sie eine neue Datenbank für die Anwendung:
 - CREATE DATABASE photoApp;
 3. Importieren Sie die Datenbankstruktur aus der bereitgestellten SQL-Datei

 ### 3. Backend konfigurieren und starten
 1. Navigieren Sie in das Verzeichnis des Backend-Projekts.
 2. Konfigurieren Sie die Datenbankverbindung in der Datei MainVerticle.java:
 - conn = DriverManager.getConnection(
        "jdbc:mariadb://localhost:3306/photoApp",
        "your_username", "your_password"); 
 3. Führen Sie Maven aus, um die Abhängigkeiten zu installieren und das Projekt zu erstellen:
 4. Starten Sie den Backend-Server

 ### 4. Frontend konfigurieren und starten
 1. Navigieren Sie in das Verzeichnis des Frontend-Projekts.
 2. Installieren Sie die erforderlichen Node-Typen für TypeScript:
 - npm install -D @types/node
 - npm install -D @types/express
 3. Intsallieren Sie Express:
 - npm install express
 4. Starten Sie den Entwicklungsserver photoApp.js

 ### 5. Anwendung aufrufen
 Öffnen Sie Ihren Browser und navigieren Sie zu der URL, unter der die Anwendung läuft

 ### 6. Benutzeranmeldung und -verwaltung
 1. Melden Sie sich mit den bereitgestellten Zugangsdaten an (Benutzername: admin & Passwort: password)
 2. Verwalten Sie Benutzer, Fotos und Alben über die entsprechende Verwaltungsoberfläche.


## DDL Skript für die Initialisierung der Datenbank (u.a. anlegen eines Admin-Nutzer)

CREATE DATABASE IF NOT EXISTS photoApp;

USE photoApp;

<p>-- Tabelle für Benutzer</p>
<p>CREATE TABLE users (</p>
   <p>userID INT AUTO_INCREMENT PRIMARY KEY,</p>
   <p>username VARCHAR(50) NOT NULL UNIQUE,</p>
   <p>hashed_password VARCHAR(255) NOT NULL,</p>
   <p>role ENUM('Admin', 'User') NOT NULL</p>
<p>);</p>

<p>-- Tabelle für Fotos</p>
<p>CREATE TABLE photos (</p>
    <p>photoID INT AUTO_INCREMENT PRIMARY KEY,</p>
    <p>title VARCHAR(50) NOT NULL,</p>
    <p>capture_date DATE NOT NULL,</p>
    <p>tags VARCHAR(255),</p>
    <p>photo_blob LONGBLOB,</p>
    <p>user_id INT,</p>
    <p>FOREIGN KEY (user_id) REFERENCES users(userID)</p>
<p>);</p>

<p>-- Tabelle für Fotoalben</p>
<p>CREATE TABLE albums (</p>
    <p>albumID INT AUTO_INCREMENT PRIMARY KEY,</p>
    <p>title VARCHAR(50) NOT NULL,</p>
    <p>tags VARCHAR(255),</p>
    <p>user_id INT,</p>
    <p>FOREIGN KEY (user_id) REFERENCES users(userID)</p>
<p>);</p>

<p>-- Verknüpfungstabelle zwischen Alben und Fotos</p>
<p>CREATE TABLE album_photos (</p>
    <p>album_id INT,</p>
    <p>photo_id INT,</p>
    <p>PRIMARY KEY (album_id, photo_id),</p>
    <p>FOREIGN KEY (album_id) REFERENCES albums(albumID),</p>
    <p>FOREIGN KEY (photo_id) REFERENCES photos(photoID)</p>
<p>);</p>

<p>-- Admin Benutzer erstellen</p>
<p>INSERT INTO users (username, hashed_password, role) VALUES ('admin',
'$2y$12$XbAaafk7KK9RxVKoHbtPmefzOMTyCvCgpKlPhEsPIuJwFW4Q6jV32', 'Admin');</p>


## ERM-Diagramm inklusive kurzer Beschreibung

Die visuelle Darstellung befindet sich im Projektordner

 ### Beziehung: users zu photos
 1:n: Ein Benutzer kann beliebig viele Fotos besitzen, jedoch gehört jedes Foto genau einem Benutzer.

 ### Beziehung: users zu albums
 1:n: Ein Benutzer kann beliebig viele Alben besitzen, jedoch gehört jedes Album genau einem Benutzer.

 ### Beziehung: albums zu photos (verbunden durch album_photos)
 n:n: Ein Album kann mehrere Fotos beinhalten und ein Foto kann in mehreren Alben auftauchen.


## Beschreibung der RESTful-API

 ### 1. An- und Abmeldung

  #### 1.1 Anmeldung
  - Pfad: /login
  - Methode: POST
  - Anfragebody: {
        <p>"username": "your_username",</p>
        <p>"password": "your_password"</p>
    <p>}</p>
  - Antwort: 201: Login erfolgreich; 400: Ungültige Anmeldedaten; 500: Datenbankfehler
  
  #### 1.2 Abmeldung
  - Pfad: /logout
  - Methode: POST
  - Antwort: 201: Logout erfolgreich

 ### 2. Benutzerverwaltung

  #### 2.1. Benutzer erstellen
  - Pfad: /users
  - Methode: POST
  - Anfragebody: {
        <p>"username": "newUser",</p>
        <p>"password": "newPassword"</p>
    <p>}</p>
  - Antwort: 201: Benutzer wurde erstellt; 500: Datenbankfehler

  #### 2.2. Alle Benutzer abrufen
  - Pfad: /users
  - Methode: GET
  - Antwort: 200; 500: Datenbankfehler

  #### 2.3. Benutzer durchsuchen</p>
  - Pfad: /users/search?searchTerm={searchTerm}
  - Methode: GET
  - Antwort: 200; 404: Keine Benutzer gefunden; 500: Datenbankfehler

  #### 2.4. Benutzerinformationen bearbeiten
  - Pfad: /users/:userID
  - Methode: PUT
  - Anfragebody: {
        <p>"username": "updatedUser",</p>
        <p>"password": "updatedPassword"</p>
    <p>}</p>
  - Antwort: 201: Benutzerinformationen geändert; 400: Fehler beim Ändern der Benutzerinformationen; 500: Datenbankfehler

  #### 2.5. Benutzer löschen
  - Pfad: /users/:userID
  - Methode: DELETE
  - Antwort: 204; 404: Benutzer konnte nicht gefunden werden; 500: Datenbankfehler</p>


 #### 3. Fotoverwaltung

  #### 3.1. Foto hochladen
  - Pfad: /:userID/photos
  - Methode: POST
  - Anfragebody: Multipart-Form-Daten (enthält Titel, Aufnahmedatum, Tags und die Fotodatei)
  - Antwort: 201: Foto hochgeladen; 500: Datenbankfehler

  #### 3.2. Foto anzeigen
  - Pfad: /photos/:photoID
  - Methode: GET
  - Antwort: 200; 404: Foto nicht gefunden; 500: Datenbankfehler

  #### 3.3. Alle Fotos des Benutzers abrufen
  - Pfad: /:userID/photos
  - Methode: GET
  - Antwort: 200; 500: Datenbankfehler

  #### 3.4. Fotos durchsuchen
  - Pfad: /:userID/photos/search?searchTerm={searchTerm}
  - Methode: GET
  - Antwort: 200; 404: Keine Fotos gefunden; 500: Datenbankfehler

  #### 3.5. Fotoinformationen bearbeiten
  - Pfad: /:userID/photos/:photoID
  - Methode: PUT
  - Anfragebody: {
        <p>"title": "updatedTitle",</p>
        <p>"capture_date": "2024-08-07",</p>
        <p>"tags": "updatedTag1, updatedTag2"</p>
    <p>}</p>
  - Antwort: 201: Fotoinformationen geändert; 500: Datenbankfehler

  #### 3.6. Foto löschen
  - Pfad: /:userID/photos/:photoID 
  - Methode: DELETE
  - Antwort: 204; 404: Foto konnte nicht gefunden werden; 500: Datenbankfehler


 #### 4. Albumverwaltung

  #### 4.1. Album erstellen
  - Pfad: /:userID/albums
  - Methode: POST
  - Anfragebody: {
        <p>"title": "newAlbum",</p>
        <p>"tags": "newTag1, newTag2"</p>
    <p>}</p>
  - Antwort: 201: Album erstellt; 500: Datenbankfehler

  #### 4.2. Alle Alben des Benutzers abrufen
  - Pfad: /:userID/albums
  - Methode: GET
  - Antwort: 200; 500: Datenbankfehler

  #### 4.3. Alben durchsuchen
  - Pfad: /:userID/albums/search?searchTerm={searchTerm}
  - Methode: GET
  - Antwort: 200; 404: Keine Alben gefunden; 500: Datenbankfehler

  #### 4.4. Albuminformationen bearbeiten
  - Pfad: /:userID/albums/:albumID
  - Methode: PUT
  - Anfragebody: {
        <p>"title": "updatedTitle",</p>
        <p>"tags": "updatedTag1, updatedTag2"</p>
    <p>}</p>
  - Antwort: 201: Fotoinformationen geändert; 500: Datenbankfehler

  #### 4.5. Album löschen
  - Pfad: /:userID/albums/:albumID
  - Methode: DELETE
  - Antwort: 204; 404: Album konnte nicht gefunden werden; 500: Datenbankfehler

  #### 4.6. Foto zu Album hinzufügen
  - Pfad: /:userID/albums/:albumID/photos/:photoID
  - Methode: POST
  - Antwort: 201: Foto zum Album hinzugefügt; 500: Datenbankfehler

  #### 4.7. Alle Fotos eines Albums abrufen
  - Pfad: /:userID/albums/:albumID/photos
  - Methode: GET
  - Antwort: 200; 404: Keine Fotos im Album gefunden; 500: Datenbankfehler

  #### 4.8. Foto aus Album entfernen
  - Pfad: /:userID/albums/:albumID/photos/:photoID
  - Methode: DELETE
  - Antwort: 204; 404: Foto nicht im Album gefunden; 500: Datenbankfehler


## Auflistung der erfüllten und nicht erfüllten Anforderungen

 #### Login
 Alle Anforderungen erfüllt.

 #### Benutzerverwaltung (Rolle Admin)
 Alle Anforderungen erfüllt.

 #### Fotos
 Alle Anforderungen erfüllt.

 #### Fotoalben
 Alle Anforderungen erfüllt bis auf das Hinzufügen und Löschen von Fotos aus Alben.
