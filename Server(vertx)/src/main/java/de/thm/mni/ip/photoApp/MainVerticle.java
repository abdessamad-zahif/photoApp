package de.thm.mni.ip.photoApp;

import at.favre.lib.crypto.bcrypt.BCrypt;
import io.vertx.core.AbstractVerticle;
import io.vertx.core.Launcher;
import io.vertx.core.Promise;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import io.vertx.core.http.HttpMethod;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.FileUpload;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.BodyHandler;
import io.vertx.ext.web.RoutingContext;
import io.vertx.ext.web.handler.CorsHandler;
import io.vertx.ext.web.handler.SessionHandler;
import io.vertx.ext.web.sstore.LocalSessionStore;
import java.sql.*;
import java.util.List;
import io.vertx.core.buffer.Buffer;



public class MainVerticle extends AbstractVerticle {

  private Connection conn;

  /**
   * Hauptmethode um die Apllikation zum Laufen zu bringen
   * @param args
   */
  public static void main(String[] args) {
    Launcher.executeCommand("run",MainVerticle.class.getName());
  }

  /**
   * Startet den HTTP Server, initialisiert die Routen und hört auf den festgelegten Port.
   * @param startPromise
   * @throws Exception wenn ein Fehler beim Starten des Servers auftritt
   */
  @Override
  public void start(Promise<Void> startPromise) throws Exception {
    try {
      conn = DriverManager.getConnection(
        "jdbc:mariadb://localhost:3306/photoApp",
        "root", "password");

      Router router = Router.router(vertx);

      // CORS handler um localhost:3000 zu erlauben die aufgelisteten http verben anzuwenden
      router.route().handler(CorsHandler.create()
        .addOrigin("http://localhost:3000")
        .allowedMethod(HttpMethod.GET)
        .allowedMethod(HttpMethod.POST)
        .allowedMethod(HttpMethod.PUT)
        .allowedMethod(HttpMethod.DELETE)
        .allowedHeader("Authorization")
        .allowedHeader("content-type")
        .allowCredentials(true)
      );

      // session handling initialisieren
      router.route().handler(SessionHandler.create(LocalSessionStore.create(vertx)));

      vertx.createHttpServer().requestHandler(router).listen(8888, http -> {
        if (http.succeeded()) {
          startPromise.complete();
          System.out.println("HTTP server started on port 8888");
        } else {
          startPromise.fail(http.cause());
        }
      });

      router.route().handler(BodyHandler.create());

      // Login und Logout Routen
      router.post("/login").handler(this::login);
      router.post("/logout").handler(this::logout);

      // Benutzerverwaltung Routen
      router.post("/users").handler(this::createUser);
      router.get("/users").handler(this::getAllUsers);
      router.get("/users/search").handler(this::searchUser);
      router.put("/users/:userID").handler(this::editUser);
      router.delete("/users/:userID").handler(this::deleteUser);

      // Fotoverwaltung Routen
      router.post("/:userID/photos").handler(this::uploadPhoto);
      router.get("/photos/:photoID").handler(this::servePhoto);
      router.get("/:userID/photos").handler(this::getAllPhotos);
      router.get("/:userID/photos/search").handler(this::searchPhoto);
      router.put("/:userID/photos/:photoID").handler(this::editPhoto);
      router.delete("/:userID/photos/:photoID").handler(this::deletePhoto);

      // Albumverwaltung Routen
      router.post("/:userID/albums").handler(this::createAlbum);
      router.get("/:userID/albums").handler(this::getAllAlbums);
      router.get("/:userID/albums/search").handler(this::searchAlbum);
      router.put("/:userID/albums/:albumID").handler(this::editAlbum);
      router.delete("/:userID/albums/:albumID").handler(this::deleteAlbum);
      router.post("/:userID/albums/:albumID/photos/:photoID").handler(this::addPhotoToAlbum);
      router.get("/:userID/albums/:albumID/photos").handler(this::getAllPhotosFromAlbum);
      router.delete("/:userID/albums/:albumID/photos/:photoID").handler(this::deletePhotoFromAlbum);

    } catch (SQLException sqlex){
      sqlex.printStackTrace();
    }
  }


  /**
   * Bearbeitet Login Request. Validiert den Benutzernamen und Passwort.
   * @param routingContext Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void login(RoutingContext routingContext) {
    JsonObject jsonBody = routingContext.getBodyAsJson();
    String username = jsonBody.getString("username");
    String password = jsonBody.getString("password");

    String query = "SELECT userID, hashed_password FROM users WHERE username = ?";
    JsonObject responseJson = new JsonObject();
    try (PreparedStatement stmt = conn.prepareStatement(query)) {
      stmt.setString(1, username);
      ResultSet rs = stmt.executeQuery();
      if (rs.next()) {
        String hashedPassword = rs.getString("hashed_password");
        if (BCrypt.verifyer().verify(password.toCharArray(), hashedPassword).verified) {
          int userID = rs.getInt("userID");
          routingContext.session().put("userID", userID);

          // userID mit einfügen in das response json
          responseJson.put("message", "Login erfolgreich");
          responseJson.put("userID", userID);

          routingContext.response()
            .setStatusCode(200)
            .putHeader("Content-Type", "application/json")
            .end(responseJson.encode());
        } else {
          responseJson.put("message", "Ungültige Anmeldedaten");
          routingContext.response()
            .setStatusCode(401)
            .putHeader("Content-Type", "application/json")
            .end(responseJson.encode());
        }
      } else {
        responseJson.put("message", "Ungültige Anmeldedaten");
        routingContext.response()
          .setStatusCode(401)
          .putHeader("Content-Type", "application/json")
          .end(responseJson.encode());
      }
    } catch (SQLException e) {
      responseJson.put("message", "Datenbankfehler: " + e.getMessage());
      routingContext.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(responseJson.encode());
    }
  }


  /**
   * Bearbeitet Logout Request indem die sSession des Users zerstört wird.
   * @param routingContext Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void logout(RoutingContext routingContext) {
    routingContext.session().destroy();
    routingContext.response().setStatusCode(200).end("Logout erfolgreich");
  }


  /**
   * Erstellt einen neuen Benutzer, wobei nur der Benutzer mit der userID 1 (Admin) dazu berechtigt ist
   * @param routingContext Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void createUser(RoutingContext routingContext) {
    // entnehme user id aus der session
    Integer userID = routingContext.session().get("userID");
    JsonObject responseJson = new JsonObject();

    // admin hat id = 1 und nur dieser darf benutzer erstellen
    if (userID == null || userID != 1) {
      responseJson.put("message", "Nur der Admin kann Benutzer erstellen");
      routingContext.response()
        .setStatusCode(403) // Forbidden
        .putHeader("Content-Type", "application/json")
        .end(responseJson.encode());
      return;
    }

    // überarbeitete benutzerinformationen erhalten
    JsonObject jsonBody = routingContext.getBodyAsJson();
    String username = jsonBody.getString("username");
    String password = jsonBody.getString("password");

    // neue benutzerinformationen in die datenbank eintragen
    String query = "INSERT INTO users (username, hashed_password) VALUES (?, ?)";

    try (PreparedStatement stmt = conn.prepareStatement(query, Statement.RETURN_GENERATED_KEYS)) {
      String hashedPassword = BCrypt.withDefaults().hashToString(12, password.toCharArray());
      stmt.setString(1, username);
      stmt.setString(2, hashedPassword);
      int affectedRows = stmt.executeUpdate();

      if (affectedRows > 0) {
        try (ResultSet generatedKeys = stmt.getGeneratedKeys()) {
          if (generatedKeys.next()) {
            int newUserID = generatedKeys.getInt(1);
            responseJson.put("message", "User created successfully");
            responseJson.put("userID", newUserID);
            routingContext.response()
              .setStatusCode(201)
              .putHeader("Content-Type", "application/json")
              .end(responseJson.encode());
          } else {
            responseJson.put("message", "Creating user failed, no ID obtained.");
            routingContext.response()
              .setStatusCode(500)
              .putHeader("Content-Type", "application/json")
              .end(responseJson.encode());
          }
        }
      } else {
        responseJson.put("message", "Creating user failed.");
        routingContext.response()
          .setStatusCode(500)
          .putHeader("Content-Type", "application/json")
          .end(responseJson.encode());
      }
    } catch (SQLException e) {
      responseJson.put("message", "Database error: " + e.getMessage());
      routingContext.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(responseJson.encode());
    }
  }


  /**
   * Ruft alle Benutzer (userID & username) aus der Datnbank ab, wobei nur der Benutzer mit der userID 1 (Admin) dazu berechtigt ist
   * @param routingContext Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void getAllUsers(RoutingContext routingContext) {

    Integer sessionUserID = routingContext.session().get("userID");

    if (sessionUserID == null || sessionUserID != 1) {
      routingContext.response().setStatusCode(403).end("Nur der Admin hat Zugriff auf Benutzer");
      return;
    }

    try {
      PreparedStatement preparedStatement = conn.prepareStatement("SELECT userID, username FROM users");
      ResultSet resultSet = preparedStatement.executeQuery();

      // json array aller benutzer deklarieren
      JsonArray users = new JsonArray();

      while (resultSet.next()) {
        JsonObject user = new JsonObject()
          .put("userID", resultSet.getInt("userID"))
          .put("username", resultSet.getString("username"));
        users.add(user);
      }

      // antwort als json array aller benutzer
      routingContext.response()
        .setStatusCode(200)
        .putHeader("Content-Type", "application/json")
        .end(users.encode());

      resultSet.close();
      preparedStatement.close();
    } catch (SQLException e) {
      routingContext.response().setStatusCode(500).end("Error: " + e.getMessage());
    }
  }


  /**
   * Sucht nach Benutzern basierend auf dem eingegebenem Suchwort, wobei nur der Benutzer mit der userID 1 (Admin) dazu berechtigt ist
   * @param context Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void searchUser(RoutingContext context) {

    Integer sessionUserID = context.session().get("userID");

    if (sessionUserID == null || sessionUserID != 1) {
      context.response().setStatusCode(403).end("Nur der Admin kann Benutzer suchen");
      return;
    }

    String searchTerm = context.queryParam("searchTerm").stream().findFirst().orElse("");
    // suchbegriff mit % umschließen sodass in der sql abfrage alle ergebnisse geliefert werden die den suchbegriff enthalten
    searchTerm = "%" + searchTerm + "%";

    try {
      String searchSql = "SELECT userID, username FROM users WHERE username LIKE ?";
      PreparedStatement preparedStatement = conn.prepareStatement(searchSql);
      preparedStatement.setString(1, searchTerm);
      ResultSet resultSet = preparedStatement.executeQuery();

      JsonArray users = new JsonArray();

      while (resultSet.next()) {
        JsonObject user = new JsonObject()
          .put("userID", resultSet.getInt("userID"))
          .put("username", resultSet.getString("username"));
        users.add(user);
      }

      if (!users.isEmpty()) {
        context.response()
          .setStatusCode(200)
          .putHeader("content-type", "application/json")
          .end(users.encode());
      } else {
        context.response().setStatusCode(404).end("Keine Benutzer gefunden");
      }

      resultSet.close();
      preparedStatement.close();
    } catch (SQLException e) {
      context.response().setStatusCode(500).end(e.getMessage());
    }
  }


  /**
   * Bearbeiten von Benutzername und/oder Passwort eines Benutzers, wobei nur der Benutzer mit der userID 1 (Admin) dazu berechtigt ist
   * @param routingContext Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void editUser(RoutingContext routingContext) {
    Integer userID = Integer.parseInt(routingContext.pathParam("userID"));
    JsonObject jsonBody = routingContext.getBodyAsJson();
    String newUsername = jsonBody.getString("username");
    String newPassword = jsonBody.getString("password");

    String query = "UPDATE users SET username = ?, hashed_password = ? WHERE userID = ?";
    JsonObject responseJson = new JsonObject();

    try (PreparedStatement stmt = conn.prepareStatement(query)) {
      String hashedPassword = BCrypt.withDefaults().hashToString(12, newPassword.toCharArray());
      stmt.setString(1, newUsername);
      stmt.setString(2, hashedPassword);
      stmt.setInt(3, userID);

      int affectedRows = stmt.executeUpdate();
      if (affectedRows > 0) {
        responseJson.put("message", "Benutzerinformationen erfolgreich geändert.");
        routingContext.response()
          .setStatusCode(200)
          .putHeader("Content-Type", "application/json")
          .end(responseJson.encode());
      } else {
        responseJson.put("message", "Fehler beim Ändern der Benutzerinformationen.");
        routingContext.response()
          .setStatusCode(400)
          .putHeader("Content-Type", "application/json")
          .end(responseJson.encode());
      }
    } catch (SQLException e) {
      responseJson.put("message", "Datenbankfehler: " + e.getMessage());
      routingContext.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(responseJson.encode());
    }
  }


  /**
   * Löscht einen Benutzer, wobei nur der Benutzer mit der userID 1 (Admin) dazu berechtigt ist
   * @param routingContext Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void deleteUser(RoutingContext routingContext) {
    Integer userID = Integer.parseInt(routingContext.pathParam("userID"));
    JsonObject responseJson = new JsonObject();

    String query = "DELETE FROM users WHERE userID = ?";
    try (PreparedStatement stmt = conn.prepareStatement(query)) {
      stmt.setInt(1, userID);
      int affectedRows = stmt.executeUpdate();

      if (affectedRows > 0) {
        responseJson.put("message", "Benutzer erfolgreich gelöscht.");
        routingContext.response()
          .setStatusCode(200)
          .putHeader("Content-Type", "application/json")
          .end(responseJson.encode());
      } else {
        responseJson.put("message", "Benutzer konnte nicht gefunden werden.");
        routingContext.response()
          .setStatusCode(404)
          .putHeader("Content-Type", "application/json")
          .end(responseJson.encode());
      }
    } catch (SQLException e) {
      responseJson.put("message", "Datenbankfehler: " + e.getMessage());
      routingContext.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(responseJson.encode());
    }
  }


  /**
   * Lädt ein Foto hoch für den angemeldeten Benutzer
   * @param routingContext Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void uploadPhoto(RoutingContext routingContext) {
    // Check if the user is logged in
    Integer userID = routingContext.session().get("userID");

    if (userID == null) {
      routingContext.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie müssen eingeloggt sein um Fotos hochzuladen").encode());
      return;
    }

    // hochladen des Fotos auf ein bestimmtes Verzeichnis
    List<FileUpload> uploads = routingContext.fileUploads();
    if (uploads.isEmpty()) {
      routingContext.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Kein Foto hochgeladen").encode());
      return;
    }
    FileUpload upload = uploads.get(0); // angenommen es wird immer nur ein Foto hochgeladen


    String title = routingContext.request().getFormAttribute("title");
    String captureDate = routingContext.request().getFormAttribute("capture_date");
    String tags = routingContext.request().getFormAttribute("tags");

    if (title == null || captureDate == null) {
      routingContext.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Titel und Aufnahmedatum dürfen nicht leer sein").encode());
      return;
    }

    vertx.fileSystem().readFile(upload.uploadedFileName(), result -> {
      if (result.failed()) {
        routingContext.response()
          .setStatusCode(500)
          .putHeader("Content-Type", "application/json")
          .end(new JsonObject().put("message", "Fehler beim Lesen der Datei").encode());
        return;
      }

      // konvertieren des fotos um es als blob in die datenbank einzutragen
      Buffer uploadedFileBuffer = result.result();
      if (uploadedFileBuffer == null) {
        routingContext.response()
          .setStatusCode(500)
          .putHeader("Content-Type", "application/json")
          .end(new JsonObject().put("message", "Fehler beim Lesen der Datei").encode());
        return;
      }

      String insertPhotoSql = "INSERT INTO photos (title, capture_date, tags, photo_blob, user_id) VALUES (?, ?, ?, ?, ?)";
      try (PreparedStatement insertPhotoStmt = conn.prepareStatement(insertPhotoSql)) {
        insertPhotoStmt.setString(1, title);
        insertPhotoStmt.setDate(2, java.sql.Date.valueOf(captureDate));
        insertPhotoStmt.setString(3, tags);
        insertPhotoStmt.setBytes(4, uploadedFileBuffer.getBytes());
        insertPhotoStmt.setInt(5, userID);

        int rowsInserted = insertPhotoStmt.executeUpdate();

        if (rowsInserted > 0) {
          routingContext.response()
            .setStatusCode(201)
            .putHeader("Content-Type", "application/json")
            .end(new JsonObject().put("message", "Foto wurde hochgeladen").encode());
        } else {
          routingContext.response()
            .setStatusCode(500)
            .putHeader("Content-Type", "application/json")
            .end(new JsonObject().put("message", "Foto konnte nicht hochgeladen werden").encode());
        }

      } catch (SQLException e) {
        routingContext.response()
          .setStatusCode(500)
          .putHeader("Content-Type", "application/json")
          .end(new JsonObject().put("message", "Datenbankfehler: " + e.getMessage()).encode());
      }
    });
  }


  /**
   * Zeigt ein Foto anhand der photoID
   * @param context Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void servePhoto(RoutingContext context) {
    String photoIDParam = context.pathParam("photoID");

    if (photoIDParam == null || photoIDParam.isEmpty()) {
      context.response().setStatusCode(400).end("Photo-ID darf nicht leer sein");
      return;
    }

    int photoID;
    try {
      photoID = Integer.parseInt(photoIDParam);
    } catch (NumberFormatException e) {
      context.response().setStatusCode(400).end("Ungültige Photo-ID");
      return;
    }

    try {
      String query = "SELECT photo_blob FROM photos WHERE photoID = ?";
      PreparedStatement preparedStatement = conn.prepareStatement(query);
      preparedStatement.setInt(1, photoID);
      ResultSet resultSet = preparedStatement.executeQuery();

      if (resultSet.next()) {
        byte[] photoBlob = resultSet.getBytes("photo_blob");

        context.response()
          .putHeader("Content-Type", "image/jpeg")
          .end(Buffer.buffer(photoBlob));
      } else {
        context.response().setStatusCode(404).end("Foto nicht gefunden");
      }

      resultSet.close();
      preparedStatement.close();
    } catch (SQLException e) {
      context.response().setStatusCode(500).end("Error: " + e.getMessage());
    }
  }


  /**
   * Ruft alle Fotos des angemeldeten Benutzers ab
   * @param routingContext Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void getAllPhotos(RoutingContext routingContext) {
    Integer sessionUserID = routingContext.session().get("userID");

    if (sessionUserID == null) {
      routingContext.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie müssen angemeldet sein um ihre Fotos zu sehen").encode());
      return;
    }

    try (PreparedStatement preparedStatement = conn.prepareStatement("SELECT photoID, title, capture_date, tags FROM photos WHERE user_id = ?")) {
      preparedStatement.setInt(1, sessionUserID);
      try (ResultSet resultSet = preparedStatement.executeQuery()) {

        JsonArray photos = new JsonArray();

        while (resultSet.next()) {
          JsonObject photo = new JsonObject()
            .put("photoID", resultSet.getInt("photoID"))
            .put("title", resultSet.getString("title"))
            .put("capture_date", resultSet.getDate("capture_date").toString())
            .put("tags", resultSet.getString("tags"))
            .put("url", "/photo/" + resultSet.getInt("photoID")); // URL to serve the photo blob
          photos.add(photo);
        }

        routingContext.response()
          .setStatusCode(200)
          .putHeader("Content-Type", "application/json")
          .end(photos.encode());
      }
    } catch (SQLException e) {
      routingContext.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Error: " + e.getMessage()).encode());
    }
  }


  /**
   * Sucht nach Fotos des angemeldeten Benutzers anhand von Titel und/oder Tags
   * @param context Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void searchPhoto(RoutingContext context) {
    Integer sessionUserID = context.session().get("userID");

    if (sessionUserID == null) {
      context.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie müssen angemeldet sein um nach Fotos zu suchen").encode());
      return;
    }

    String userIDParam = context.pathParam("userID");

    if (userIDParam == null || userIDParam.isEmpty()) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "User-ID darf nicht leer sein").encode());
      return;
    }

    int userID;
    try {
      userID = Integer.parseInt(userIDParam);
    } catch (NumberFormatException e) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Ungültige User-ID").encode());
      return;
    }

    if (!sessionUserID.equals(userID)) {
      context.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie können nur nach eigenen Fotos suchen").encode());
      return;
    }

    String searchTerm = context.queryParam("searchTerm").stream().findFirst().orElse("");
    searchTerm = "%" + searchTerm + "%";

    try {
      String searchSql = "SELECT photoID, title, capture_date, tags FROM photos WHERE user_id = ? AND (title LIKE ? OR tags LIKE ?)";
      PreparedStatement preparedStatement = conn.prepareStatement(searchSql);
      preparedStatement.setInt(1, userID);
      preparedStatement.setString(2, searchTerm);
      preparedStatement.setString(3, searchTerm);
      ResultSet resultSet = preparedStatement.executeQuery();

      JsonArray photos = new JsonArray();

      while (resultSet.next()) {
        JsonObject photo = new JsonObject()
          .put("photoID", resultSet.getInt("photoID"))
          .put("title", resultSet.getString("title"))
          .put("capture_date", resultSet.getDate("capture_date").toString())
          .put("tags", resultSet.getString("tags"))
          .put("url", "/photo/" + resultSet.getInt("photoID"));
        photos.add(photo);
      }

      if (!photos.isEmpty()) {
        context.response()
          .setStatusCode(200)
          .putHeader("Content-Type", "application/json")
          .end(photos.encode());
      } else {
        context.response()
          .setStatusCode(404)
          .putHeader("Content-Type", "application/json")
          .end(new JsonObject().put("message", "Keine Fotos gefunden").encode());
      }

    } catch (SQLException e) {
      context.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Error: " + e.getMessage()).encode());
    }
  }


  /**
   * Bearbeitet die Fotoinformationen (Titel und/oder Tags) eines Fotos des angemeldeten Benutzers
   * @param context Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void editPhoto(RoutingContext context) {
    Integer sessionUserID = context.session().get("userID");

    if (sessionUserID == null) {
      context.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie müssen eingeloggt sein um Fotos zu bearbeiten").encode());
      return;
    }

    String userIDParam = context.pathParam("userID");
    String photoIDParam = context.pathParam("photoID");
    JsonObject jsonBody = context.getBodyAsJson();

    if (userIDParam == null || userIDParam.isEmpty()) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "User-ID darf nicht leer sein").encode());
      return;
    }

    if (photoIDParam == null || photoIDParam.isEmpty()) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Photo-ID darf nicht leer sein").encode());
      return;
    }

    if (jsonBody == null) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Request body wird benötigt").encode());
      return;
    }

    String newTitle = jsonBody.getString("title");
    String newTags = jsonBody.getString("tags");

    if (newTitle == null || newTags == null) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Titel und Tags dürfen nicht leer sein.").encode());
      return;
    }

    int userID;
    int photoID;
    try {
      userID = Integer.parseInt(userIDParam);
      photoID = Integer.parseInt(photoIDParam);
    } catch (NumberFormatException e) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Ungültige User-ID oder Photo-ID").encode());
      return;
    }

    // Ensure the logged in user is the same as the userID in the path
    if (!sessionUserID.equals(userID)) {
      context.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie können nur ihre eigenen Fotos bearbeiten").encode());
      return;
    }

    try {
      // überprüfen ob das foto existiert und welchem benutzer gehört
      String checkPhotoSql = "SELECT * FROM photos WHERE photoID = ? AND user_id = ?";
      try (PreparedStatement checkStmt = conn.prepareStatement(checkPhotoSql)) {
        checkStmt.setInt(1, photoID);
        checkStmt.setInt(2, userID);
        try (ResultSet checkResult = checkStmt.executeQuery()) {
          if (!checkResult.next()) {
            context.response()
              .setStatusCode(404)
              .putHeader("Content-Type", "application/json")
              .end(new JsonObject().put("message", "Foto nicht gefunden oder gehört nicht zu diesem Benutzer").encode());
            return;
          }
        }
      }

      String updateSql = "UPDATE photos SET title = ?, tags = ? WHERE photoID = ? AND user_id = ?";
      try (PreparedStatement updateStmt = conn.prepareStatement(updateSql)) {
        updateStmt.setString(1, newTitle);
        updateStmt.setString(2, newTags);
        updateStmt.setInt(3, photoID);
        updateStmt.setInt(4, userID);

        int rowsAffected = updateStmt.executeUpdate();
        if (rowsAffected > 0) {
          context.response()
            .setStatusCode(200)
            .putHeader("Content-Type", "application/json")
            .end(new JsonObject().put("message", "Fotoinformationen geändert.").encode());
        } else {
          context.response()
            .setStatusCode(404)
            .putHeader("Content-Type", "application/json")
            .end(new JsonObject().put("message", "Foto nicht gefunden.").encode());
        }
      }
    } catch (SQLException e) {
      e.printStackTrace();
      context.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Foto konnte nicht geändert werden: " + e.getMessage()).encode());
    } catch (Exception e) {
      e.printStackTrace();
      context.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Ein unerwarteter Fehler ist aufgetreten: " + e.getMessage()).encode());
    }
  }


  /**
   * Löscht ein Foto anhand der photoID
   * @param context Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void deletePhoto(RoutingContext context) {
    Integer sessionUserID = context.session().get("userID");

    if (sessionUserID == null) {
      context.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie müssen angemeldet sein um Fotos zu löschen").encode());
      return;
    }

    String userIDParam = context.pathParam("userID");
    String photoIDParam = context.pathParam("photoID");

    if (userIDParam == null || userIDParam.isEmpty()) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "User-ID fehlt").encode());
      return;
    }

    if (photoIDParam == null || photoIDParam.isEmpty()) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Photo-ID fehlt").encode());
      return;
    }

    int userID;
    int photoID;
    try {
      userID = Integer.parseInt(userIDParam);
      photoID = Integer.parseInt(photoIDParam);
    } catch (NumberFormatException e) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Ungültige User-ID oder Photo-ID").encode());
      return;
    }

    if (!sessionUserID.equals(userID)) {
      context.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie dürfen nur eigene Fotos löschen").encode());
      return;
    }

    try (PreparedStatement preparedStatement = conn.prepareStatement("DELETE FROM photos WHERE photoID = ? AND user_id = ?")) {
      preparedStatement.setInt(1, photoID);
      preparedStatement.setInt(2, userID);
      int rowsAffected = preparedStatement.executeUpdate();

      if (rowsAffected > 0) {
        context.response()
          .setStatusCode(204)
          .end();
      } else {
        context.response()
          .setStatusCode(404)
          .putHeader("Content-Type", "application/json")
          .end(new JsonObject().put("message", "Foto existiert nicht oder wurde bereits gelöscht").encode());
      }
    } catch (SQLException e) {
      context.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Datenbankfehler: " + e.getMessage()).encode());
    }
  }


  /**
   * Erstellt ein Album für den angemeldeten Benutzer
   * @param routingContext Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void createAlbum(RoutingContext routingContext) {
    Integer sessionUserID = routingContext.session().get("userID");

    if (sessionUserID == null) {
      routingContext.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie müssen angemeldet sein um ein Album zu löschen").encode());
      return;
    }

    JsonObject jsonBody = routingContext.getBodyAsJson();
    if (jsonBody == null) {
      routingContext.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Request body wird benötigt").encode());
      return;
    }

    String title = jsonBody.getString("title");
    String tags = jsonBody.getString("tags");

    if (title == null) {
      routingContext.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Ein Fotoalbum muss einen Titel haben").encode());
      return;
    }

    try {
      // Insert new album into the database
      String insertAlbumSql = "INSERT INTO albums (title, tags, user_id) VALUES (?, ?, ?)";
      try (PreparedStatement insertAlbumStmt = conn.prepareStatement(insertAlbumSql)) {
        insertAlbumStmt.setString(1, title);
        insertAlbumStmt.setString(2, tags);
        insertAlbumStmt.setInt(3, sessionUserID);
        int rowsInserted = insertAlbumStmt.executeUpdate();

        if (rowsInserted > 0) {
          System.out.println("Insert erfolgreich \nAlbum: " + title + " \nTags: " + tags + " wurde erstellt.");
          routingContext.response()
            .setStatusCode(201)
            .putHeader("Content-Type", "application/json")
            .end(new JsonObject().put("message", "Album erfolgreich erstellt").encode());
        } else {
          routingContext.response()
            .setStatusCode(500)
            .putHeader("Content-Type", "application/json")
            .end(new JsonObject().put("message", "Album konnte nicht erstellt werden").encode());
        }
      }
    } catch (SQLException e) {
      routingContext.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Datenbankfehler: " + e.getMessage()).encode());
    } catch (Exception e) {
      routingContext.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Fehler: " + e.getMessage()).encode());
    }
  }


  /**
   * Ruft alle Alben des angemeldeten Benutzers ab
   * @param routingContext Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void getAllAlbums(RoutingContext routingContext) {
    Integer sessionUserID = routingContext.session().get("userID");

    if (sessionUserID == null) {
      routingContext.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie müssen angemeldet sein um Ihre Alben zu sehen").encode());
      return;
    }

    String userIDParam = routingContext.pathParam("userID");

    if (userIDParam == null || userIDParam.isEmpty()) {
      routingContext.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "User-ID darf nicht leer sein").encode());
      return;
    }

    int userID;
    try {
      userID = Integer.parseInt(userIDParam);
    } catch (NumberFormatException e) {
      routingContext.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Ungültige User-ID").encode());
      return;
    }

    if (!sessionUserID.equals(userID)) {
      routingContext.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie können nur Ihre eigenen Alben sehen").encode());
      return;
    }

    try (PreparedStatement preparedStatement = conn.prepareStatement("SELECT albumID, title, tags FROM albums WHERE user_id = ?")) {
      preparedStatement.setInt(1, userID);
      try (ResultSet resultSet = preparedStatement.executeQuery()) {

        JsonArray albums = new JsonArray();

        while (resultSet.next()) {
          JsonObject album = new JsonObject()
            .put("albumID", resultSet.getInt("albumID"))
            .put("title", resultSet.getString("title"))
            .put("tags", resultSet.getString("tags"));
          albums.add(album);
        }

        routingContext.response()
          .setStatusCode(200)
          .putHeader("Content-Type", "application/json")
          .end(albums.encode());
      }
    } catch (SQLException e) {
      routingContext.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Fehler: " + e.getMessage()).encode());
    }
  }


  /**
   * Sucht nach Alben des angemeldeten Benutzers anhand Titel und/oder Tags
   * @param context Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void searchAlbum(RoutingContext context) {
    Integer sessionUserID = context.session().get("userID");

    if (sessionUserID == null) {
      context.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie müssen angemeldet sein um nach Alben zu suchen").encode());
      return;
    }

    String userIDParam = context.pathParam("userID");

    if (userIDParam == null || userIDParam.isEmpty()) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "User-ID darf nicht leer sein").encode());
      return;
    }

    int userID;
    try {
      userID = Integer.parseInt(userIDParam);
    } catch (NumberFormatException e) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Ungültige User-ID").encode());
      return;
    }

    if (!sessionUserID.equals(userID)) {
      context.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie dürfen nur nach Ihren eigenen Alben suchen").encode());
      return;
    }

    String searchTerm = context.queryParam("searchTerm").stream().findFirst().orElse("");
    searchTerm = "%" + searchTerm + "%";

    try (PreparedStatement preparedStatement = conn.prepareStatement("SELECT albumID, title, tags FROM albums WHERE user_id = ? AND (title LIKE ? OR tags LIKE ?)")) {
      preparedStatement.setInt(1, userID);
      preparedStatement.setString(2, searchTerm);
      preparedStatement.setString(3, searchTerm);

      try (ResultSet resultSet = preparedStatement.executeQuery()) {
        JsonArray albums = new JsonArray();

        while (resultSet.next()) {
          JsonObject album = new JsonObject()
            .put("albumID", resultSet.getInt("albumID"))
            .put("title", resultSet.getString("title"))
            .put("tags", resultSet.getString("tags"));
          albums.add(album);
        }

        if (albums.isEmpty()) {
          context.response()
            .setStatusCode(404)
            .putHeader("Content-Type", "application/json")
            .end(new JsonObject().put("message", "Keine Alben gefunden").encode());
        } else {
          context.response()
            .setStatusCode(200)
            .putHeader("Content-Type", "application/json")
            .end(albums.encode());
        }
      }
    } catch (SQLException e) {
      context.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Datenbankfehler: " + e.getMessage()).encode());
    }
  }


  /**
   * Bearbeitet die Albuminformationen (Titel und/oder Tags) eines Albums des angemeldeten Benutzers
   * @param context Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void editAlbum(RoutingContext context) {
    Integer sessionUserID = context.session().get("userID");

    if (sessionUserID == null) {
      context.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie müssen eingeloggt sein um Alben zu bearbeiten").encode());
      return;
    }

    String userIDParam = context.pathParam("userID");
    String albumIDParam = context.pathParam("albumID");
    JsonObject jsonBody = context.getBodyAsJson();

    if (userIDParam == null || userIDParam.isEmpty()) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "User-ID darf nicht leer sein").encode());
      return;
    }

    if (albumIDParam == null || albumIDParam.isEmpty()) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Album-ID darf nicht leer sein").encode());
      return;
    }

    if (jsonBody == null) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Request body wird benötigt").encode());
      return;
    }

    String newTitle = jsonBody.getString("title");
    String newTags = jsonBody.getString("tags");

    if (newTitle == null || newTags == null) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Titel und Tags dürfen nicht leer sein.").encode());
      return;
    }

    int userID;
    int albumID;
    try {
      userID = Integer.parseInt(userIDParam);
      albumID = Integer.parseInt(albumIDParam);
    } catch (NumberFormatException e) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Ungültige User-ID oder Album-ID").encode());
      return;
    }

    if (!sessionUserID.equals(userID)) {
      context.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie können nur Ihre einen Alben bearbeiten").encode());
      return;
    }

    try {
      // überprüfen ob das album existiert und dem benutzer gehört
      String checkAlbumSql = "SELECT * FROM albums WHERE albumID = ? AND user_id = ?";
      try (PreparedStatement checkStmt = conn.prepareStatement(checkAlbumSql)) {
        checkStmt.setInt(1, albumID);
        checkStmt.setInt(2, userID);
        try (ResultSet checkResult = checkStmt.executeQuery()) {
          if (!checkResult.next()) {
            context.response()
              .setStatusCode(404)
              .putHeader("Content-Type", "application/json")
              .end(new JsonObject().put("message", "Album nicht gefunden oder gehört nicht zu diesem Benutzer").encode());
            return;
          }
        }
      }

      String updateSql = "UPDATE albums SET title = ?, tags = ? WHERE albumID = ? AND user_id = ?";
      try (PreparedStatement updateStmt = conn.prepareStatement(updateSql)) {
        updateStmt.setString(1, newTitle);
        updateStmt.setString(2, newTags);
        updateStmt.setInt(3, albumID);
        updateStmt.setInt(4, userID);

        int rowsAffected = updateStmt.executeUpdate();
        if (rowsAffected > 0) {
          context.response()
            .setStatusCode(200)
            .putHeader("Content-Type", "application/json")
            .end(new JsonObject().put("message", "Album erfolgreich geändert.").encode());
        } else {
          context.response()
            .setStatusCode(404)
            .putHeader("Content-Type", "application/json")
            .end(new JsonObject().put("message", "Album nicht gefunden.").encode());
        }
      }
    } catch (SQLException e) {
      e.printStackTrace();
      context.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Album konnte nicht geändert werden: " + e.getMessage()).encode());
    } catch (Exception e) {
      e.printStackTrace();
      context.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Fehler: " + e.getMessage()).encode());
    }
  }


  /**
   * Löscht ein Album anhand der albumID
   * @param context Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void deleteAlbum(RoutingContext context) {
    Integer sessionUserID = context.session().get("userID");

    if (sessionUserID == null) {
      context.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie müssen angemeldet sein um Alben zu löschen").encode());
      return;
    }

    String userIDParam = context.pathParam("userID");
    String albumIDParam = context.pathParam("albumID");

    if (userIDParam == null || userIDParam.isEmpty()) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "User-ID fehlt").encode());
      return;
    }

    if (albumIDParam == null || albumIDParam.isEmpty()) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Album-ID fehlt").encode());
      return;
    }

    int userID;
    int albumID;
    try {
      userID = Integer.parseInt(userIDParam);
      albumID = Integer.parseInt(albumIDParam);
    } catch (NumberFormatException e) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Ungültige User-ID oder Album-ID").encode());
      return;
    }

    if (!sessionUserID.equals(userID)) {
      context.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie können nur eigene Alben löschen").encode());
      return;
    }

    try (PreparedStatement preparedStatement = conn.prepareStatement("DELETE FROM albums WHERE albumID = ? AND user_id = ?")) {
      preparedStatement.setInt(1, albumID);
      preparedStatement.setInt(2, userID);
      int rowsAffected = preparedStatement.executeUpdate();

      if (rowsAffected > 0) {
        context.response()
          .setStatusCode(204)
          .end();
      } else {
        context.response()
          .setStatusCode(404)
          .putHeader("Content-Type", "application/json")
          .end(new JsonObject().put("message", "Album existiert nicht oder wurde bereits gelöscht").encode());
      }
    } catch (SQLException e) {
      context.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Datenbankfehler: " + e.getMessage()).encode());
    }
  }


  /**
   * Fügt ein Foto des Benutzers eines seiner Alben hinzu
   * @param routingContext Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void addPhotoToAlbum(RoutingContext routingContext) {
    Integer sessionUserID = routingContext.session().get("userID");

    if (sessionUserID == null) {
      routingContext.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie müssen eingeloggt sein um Fotos zu Alben hinzuzufügen").encode());
      return;
    }

    String userIDParam = routingContext.pathParam("userID");
    String albumIDParam = routingContext.pathParam("albumID");
    String photoIDParam = routingContext.pathParam("photoID");

    if (userIDParam == null || userIDParam.isEmpty()) {
      routingContext.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "User-ID darf nicht leer sein").encode());
      return;
    }

    if (albumIDParam == null || albumIDParam.isEmpty()) {
      routingContext.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Album-ID darf nicht leer sein").encode());
      return;
    }

    if (photoIDParam == null || photoIDParam.isEmpty()) {
      routingContext.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Photo-ID darf nicht leer sein").encode());
      return;
    }

    int userID;
    int albumID;
    int photoID;
    try {
      userID = Integer.parseInt(userIDParam);
      albumID = Integer.parseInt(albumIDParam);
      photoID = Integer.parseInt(photoIDParam);
    } catch (NumberFormatException e) {
      routingContext.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Ungültige User-ID, Album-ID oder Photo-ID").encode());
      return;
    }

    if (!sessionUserID.equals(userID)) {
      routingContext.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie können Fotos nur zu eigenen Alben hinzufügen").encode());
      return;
    }

    try {
      // überprüfen ob das album zum benutzer gehört
      String verifyAlbumSql = "SELECT user_id FROM albums WHERE albumID = ? AND user_id = ?";
      try (PreparedStatement verifyAlbumStmt = conn.prepareStatement(verifyAlbumSql)) {
        verifyAlbumStmt.setInt(1, albumID);
        verifyAlbumStmt.setInt(2, userID);
        try (ResultSet albumResultSet = verifyAlbumStmt.executeQuery()) {
          if (!albumResultSet.next()) {
            routingContext.response()
              .setStatusCode(403)
              .putHeader("Content-Type", "application/json")
              .end(new JsonObject().put("message", "Sie haben nicht die Berechtigung, Fotos in dieses Album hinzuzufügen").encode());
            return;
          }
        }
      }

      String insertSql = "INSERT INTO album_photos (album_id, photo_id) VALUES (?, ?)";
      try (PreparedStatement insertStmt = conn.prepareStatement(insertSql)) {
        insertStmt.setInt(1, albumID);
        insertStmt.setInt(2, photoID);
        int rowsInserted = insertStmt.executeUpdate();

        if (rowsInserted > 0) {
          routingContext.response()
            .setStatusCode(201)
            .putHeader("Content-Type", "application/json")
            .end(new JsonObject().put("message", "Foto erfolgreich zum Album hinzugefügt").encode());
        } else {
          routingContext.response()
            .setStatusCode(500)
            .putHeader("Content-Type", "application/json")
            .end(new JsonObject().put("message", "Foto konnte nicht zum Album hinzugefügt werden").encode());
        }
      }
    } catch (SQLException e) {
      routingContext.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Datenbankfehler: " + e.getMessage()).encode());
    } catch (Exception e) {
      routingContext.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Fehler: " + e.getMessage()).encode());
    }
  }


  /**
   * Ruft alle Fotos eines Albums des Benutzers ab
   * @param routingContext Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void getAllPhotosFromAlbum(RoutingContext routingContext) {
    Integer sessionUserID = routingContext.session().get("userID");

    if (sessionUserID == null) {
      routingContext.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie müssen eingeloggt sein").encode());
      return;
    }

    String userIDParam = routingContext.pathParam("userID");
    String albumIDParam = routingContext.pathParam("albumID");

    if (userIDParam == null || userIDParam.isEmpty()) {
      routingContext.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "User-ID darf nicht leer sein").encode());
      return;
    }

    if (albumIDParam == null || albumIDParam.isEmpty()) {
      routingContext.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Album-ID darf nicht leer sein").encode());
      return;
    }

    int userID;
    int albumID;
    try {
      userID = Integer.parseInt(userIDParam);
      albumID = Integer.parseInt(albumIDParam);
    } catch (NumberFormatException e) {
      routingContext.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Ungültige User-ID oder Album-ID").encode());
      return;
    }

    if (!sessionUserID.equals(userID)) {
      routingContext.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Unauthorized: You can only view photos in your own albums.").encode());
      return;
    }

    try {
      String verifyAlbumSql = "SELECT user_id FROM albums WHERE albumID = ? AND user_id = ?";
      try (PreparedStatement verifyAlbumStmt = conn.prepareStatement(verifyAlbumSql)) {
        verifyAlbumStmt.setInt(1, albumID);
        verifyAlbumStmt.setInt(2, userID);
        try (ResultSet albumResultSet = verifyAlbumStmt.executeQuery()) {
          if (!albumResultSet.next()) {
            routingContext.response()
              .setStatusCode(403)
              .putHeader("Content-Type", "application/json")
              .end(new JsonObject().put("message", "Sie haben nicht die Berechtigung, Fotos in diesem Album zu sehen").encode());
            return;
          }
        }
      }

      String getPhotosSql = "SELECT p.photoID, p.title, p.capture_date, p.tags, p.photo_blob FROM photos p JOIN album_photos ap ON p.photoID = ap.photo_id WHERE ap.album_id = ?";
      try (PreparedStatement getPhotosStmt = conn.prepareStatement(getPhotosSql)) {
        getPhotosStmt.setInt(1, albumID);
        try (ResultSet resultSet = getPhotosStmt.executeQuery()) {

          JsonArray photos = new JsonArray();

          while (resultSet.next()) {
            JsonObject photo = new JsonObject()
              .put("photoID", resultSet.getInt("photoID"))
              .put("title", resultSet.getString("title"))
              .put("capture_date", resultSet.getDate("capture_date").toString())
              .put("tags", resultSet.getString("tags"))
              .put("photo_blob", resultSet.getBytes("photo_blob"));
            photos.add(photo);
          }

          if (!photos.isEmpty()) {
            routingContext.response()
              .setStatusCode(200)
              .putHeader("Content-Type", "application/json")
              .end(photos.encode());
          } else {
            routingContext.response()
              .setStatusCode(404)
              .putHeader("Content-Type", "application/json")
              .end(new JsonObject().put("message", "Keine Fotos im Album gefunden").encode());
          }
        }
      }
    } catch (SQLException e) {
      routingContext.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Datenbankfehler: " + e.getMessage()).encode());
    }
  }


  /**
   * Löscht ein Foto aus dem Album eines Benutzers
   * @param context Kontext für die Weiterleitung der HTTP-Anfrage
   */
  private void deletePhotoFromAlbum(RoutingContext context) {
    Integer sessionUserID = context.session().get("userID");

    if (sessionUserID == null) {
      context.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie müssen eingeloggt sein um Fotos aus Alben zu löschen").encode());
      return;
    }

    String userIDParam = context.pathParam("userID");
    String albumIDParam = context.pathParam("albumID");
    String photoIDParam = context.pathParam("photoID");

    if (userIDParam == null || userIDParam.isEmpty()) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "User-ID darf nicht leer sein").encode());
      return;
    }

    if (albumIDParam == null || albumIDParam.isEmpty()) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Album-ID darf nicht leer sein").encode());
      return;
    }

    if (photoIDParam == null || photoIDParam.isEmpty()) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Photo-ID darf nicht leer sein").encode());
      return;
    }

    int userID;
    int albumID;
    int photoID;
    try {
      userID = Integer.parseInt(userIDParam);
      albumID = Integer.parseInt(albumIDParam);
      photoID = Integer.parseInt(photoIDParam);
    } catch (NumberFormatException e) {
      context.response()
        .setStatusCode(400)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Ungültige User-ID, Album-ID oder Photo-ID").encode());
      return;
    }

    if (!sessionUserID.equals(userID)) {
      context.response()
        .setStatusCode(403)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Sie können nur Fotos aus eigenen Alben löschen").encode());
      return;
    }

    try {
      String verifyAlbumSql = "SELECT user_id FROM albums WHERE albumID = ? AND user_id = ?";
      try (PreparedStatement verifyAlbumStmt = conn.prepareStatement(verifyAlbumSql)) {
        verifyAlbumStmt.setInt(1, albumID);
        verifyAlbumStmt.setInt(2, userID);
        try (ResultSet albumResultSet = verifyAlbumStmt.executeQuery()) {
          if (!albumResultSet.next()) {
            context.response()
              .setStatusCode(403)
              .putHeader("Content-Type", "application/json")
              .end(new JsonObject().put("message", "Sie haben nicht die Berechtigung, Fotos in diesem Album zu löschen").encode());
            return;
          }
        }
      }

      String deleteSql = "DELETE FROM album_photos WHERE album_id = ? AND photo_id = ?";
      try (PreparedStatement deleteStmt = conn.prepareStatement(deleteSql)) {
        deleteStmt.setInt(1, albumID);
        deleteStmt.setInt(2, photoID);
        int rowsDeleted = deleteStmt.executeUpdate();

        if (rowsDeleted > 0) {
          context.response()
            .setStatusCode(204)
            .end();
        } else {
          context.response()
            .setStatusCode(404)
            .putHeader("Content-Type", "application/json")
            .end(new JsonObject().put("message", "Foto nicht im Album gefunden oder bereits gelöscht").encode());
        }
      }
    } catch (SQLException e) {
      context.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Datenbankfehler: " + e.getMessage()).encode());
    } catch (Exception e) {
      context.response()
        .setStatusCode(500)
        .putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("message", "Fehler: " + e.getMessage()).encode());
    }
  }

}



