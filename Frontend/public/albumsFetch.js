"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Fetcht Daten aus der erhaltenen url und handelt response je nachdem ob diese erfolgreich war oder nicht
 * @param url URL aus der die Daten gefetcht werden
 * @param options Optionen des Fetch requests
 * @param elementId ID des html elements auf der die Meldung angezeigt wird
 * @param successMessage Meldung die angezeigt wird bei erfolgreichem Request
 * @param errorMessage Meldung bei fehlgeschlagenem Request
 */
// @ts-ignore
function handleFetch(url, options, elementId, successMessage, errorMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield fetch(url, options);
            // überprüfe ob die antwort als json empfangen wird
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = yield res.json();
                if (res.ok) {
                    showMessage(elementId, successMessage, 'alert-success');
                }
                else {
                    showMessage(elementId, `${errorMessage}: ${data.message || 'Unknown error'}`, 'alert-danger');
                }
            }
            else {
                const text = yield res.text();
                console.error("Expected JSON response but got:", text);
                showMessage(elementId, `${errorMessage}: Unexpected response format`, 'alert-danger');
            }
        }
        catch (error) {
            showMessage(elementId, errorMessage, 'alert-danger');
        }
    });
}
/**
 * Zeigt eine Nachricht im festgelegten html element an und wendet eine css klasse an um die meldung zu stylen
 * @param elementId ID des html elements auf der die Nachricht angezeigt wird
 * @param message Nachricht die angezeigt wird
 * @param alertClass css klasse für das styling
 */
// @ts-ignore
function showMessage(elementId, message, alertClass) {
    const result = document.getElementById(elementId);
    if (result) {
        result.textContent = message;
        result.className = `alert ${alertClass}`;
    }
}
/**
 * Entnimmt die User ID aus localStorage
 *  @returns Die User ID als String
 *  @throws Fehler falls die User ID nicht gefunden wird
 */
// @ts-ignore
function getUserID() {
    const userID = localStorage.getItem('userID');
    if (!userID) {
        throw new Error('User ID not found in localStorage. Please log in.');
    }
    return userID;
}
/**
 * Abmelden des Benutzers indem ein logout Request an den Server gesendet wird, die User ID aus localStorage
 * entfernt und man auf die login Seite weitergeleitet wird
 */
// @ts-ignore
function logout() {
    return __awaiter(this, void 0, void 0, function* () {
        const url = 'http://localhost:8888/logout';
        const options = {
            method: 'POST',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include'
        };
        yield handleFetch(url, options, 'result', 'Logout successful', 'Logout failed');
        localStorage.removeItem('userID');
        window.location.href = 'login.html';
    });
}
/**
 * Erstellt ein neues Album für den angemeldeten Benutzer
 * @param title Albumtitel
 * @param tags Tags des Albums
 */
function createAlbum(title, tags) {
    return __awaiter(this, void 0, void 0, function* () {
        const userID = getUserID();
        const url = `http://localhost:8888/${userID}/albums`;
        const options = {
            method: 'POST',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include',
            body: JSON.stringify({ title, tags })
        };
        yield handleFetch(url, options, 'result', 'Album created successfully', 'Album creation failed');
    });
}
/**
 * Ruft alle Alben des Benutzers ab und zeigt diese in einem html element
 */
function getAllAlbums() {
    return __awaiter(this, void 0, void 0, function* () {
        const userID = getUserID();
        const url = `http://localhost:8888/${userID}/albums`;
        const options = {
            method: 'GET',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include'
        };
        try {
            const res = yield fetch(url, options);
            const data = yield res.json();
            if (res.ok) {
                const albumsList = document.getElementById('albumsList');
                if (albumsList) {
                    albumsList.innerHTML = '';
                    if (data.length > 0) {
                        data.forEach((album) => {
                            const albumItem = document.createElement('div');
                            albumItem.classList.add('album-item', 'alert', 'alert-info');
                            albumItem.innerHTML = `
                            <strong>Title:</strong> ${album.title} <br>
                            <strong>Tags:</strong> ${album.tags}
                            <button class="edit-btn btn btn-warning btn-sm ml-2">Edit</button>
                            <button class="delete-btn btn btn-danger btn-sm ml-2">Delete</button>
                            <button class="open-btn btn btn-info btn-sm ml-2">Open</button>
                        `;
                            albumsList.appendChild(albumItem);
                            const editBtn = albumItem.querySelector('.edit-btn');
                            const deleteBtn = albumItem.querySelector('.delete-btn');
                            const openBtn = albumItem.querySelector('.open-btn');
                            if (editBtn) {
                                editBtn.addEventListener('click', () => {
                                    showEditForm(album.albumID, album.title, album.tags);
                                });
                            }
                            if (deleteBtn) {
                                deleteBtn.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                                    yield deleteAlbum(album.albumID);
                                    yield getAllAlbums();
                                }));
                            }
                            if (openBtn) {
                                openBtn.addEventListener('click', () => {
                                    openAlbum(album.albumID, album.title);
                                });
                            }
                        });
                    }
                    else {
                        albumsList.textContent = "No albums found.";
                    }
                }
            }
            else {
                showMessage('albumsList', 'Failed to retrieve albums', 'alert-danger');
            }
        }
        catch (error) {
            showMessage('albumsList', 'Failed to retrieve albums', 'alert-danger');
        }
    });
}
/**
 * Sucht nach einem Album basierend auf dem eingegeben Suchwort und zeigt das Ergebnis in einem html element
 * @param searchTerm Suchwort welches in Albumtitel und Tags berücksichtigt wird
 */
function searchAlbum(searchTerm) {
    return __awaiter(this, void 0, void 0, function* () {
        const userID = getUserID();
        const url = `http://localhost:8888/${userID}/albums/search?searchTerm=${encodeURIComponent(searchTerm)}`;
        const options = {
            method: 'GET',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include'
        };
        try {
            const res = yield fetch(url, options);
            const data = yield res.json();
            if (res.ok) {
                const albumsList = document.getElementById('albumsList');
                if (albumsList) {
                    albumsList.innerHTML = '';
                    if (data.length > 0) {
                        data.forEach((album) => {
                            const albumItem = document.createElement('div');
                            albumItem.classList.add('album-item', 'alert', 'alert-info');
                            albumItem.innerHTML = `
                            <strong>Title:</strong> ${album.title} <br>
                            <strong>Tags:</strong> ${album.tags}
                            <button class="edit-btn btn btn-warning btn-sm ml-2">Edit</button>
                            <button class="delete-btn btn btn-danger btn-sm ml-2">Delete</button>
                            <button class="open-btn btn btn-info btn-sm ml-2">Open</button>
                        `;
                            albumsList.appendChild(albumItem);
                            const editBtn = albumItem.querySelector('.edit-btn');
                            const deleteBtn = albumItem.querySelector('.delete-btn');
                            const openBtn = albumItem.querySelector('.open-btn');
                            if (editBtn) {
                                editBtn.addEventListener('click', () => {
                                    showEditForm(album.albumID, album.title, album.tags);
                                });
                            }
                            if (deleteBtn) {
                                deleteBtn.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                                    yield deleteAlbum(album.albumID);
                                    yield searchAlbum(searchTerm);
                                }));
                            }
                            if (openBtn) {
                                openBtn.addEventListener('click', () => {
                                    openAlbum(album.albumID, album.title);
                                });
                            }
                        });
                    }
                    else {
                        albumsList.textContent = "No albums found.";
                    }
                }
            }
            else {
                showMessage('albumsList', 'Failed to search albums', 'alert-danger');
            }
        }
        catch (error) {
            showMessage('albumsList', 'Failed to search albums', 'alert-danger');
        }
    });
}
/**
 * Öffnet ein Album anhand der Id und zeigt die enthaltenen Fotos, sowie die Option Fotos hinzuzufügen oder zu löschen
 * @param albumID ID des Albums welches geöffnet wird
 * @param title Titel des Albums
 */
function openAlbum(albumID, title) {
    const albumPhotosSection = document.getElementById('albumPhotosSection');
    if (albumPhotosSection) {
        albumPhotosSection.style.display = 'block';
        const photosList = document.getElementById('photosList');
        const albumTitle = document.createElement('h5');
        albumTitle.textContent = `Album: ${title}`;
        photosList === null || photosList === void 0 ? void 0 : photosList.insertAdjacentElement('beforebegin', albumTitle);
        getAllPhotos();
        const addPhotoForm = document.getElementById('addPhotoForm');
        if (addPhotoForm) {
            addPhotoForm.addEventListener('submit', (event) => __awaiter(this, void 0, void 0, function* () {
                event.preventDefault(); // Prevent the default form submission
                const photoIDInput = document.getElementById('photoID');
                if (photoIDInput) {
                    const photoID = parseInt(photoIDInput.value);
                    yield addPhotoToAlbum(albumID, photoID);
                    yield getAllPhotosFromAlbum(albumID);
                }
            }));
        }
        getAllPhotosFromAlbum(albumID); // fotos die sich im album befinden laden
    }
}
/**
 * Zeigt alle Fotos sowie die Option diese zu einem Album hinzuzufügen
 */
// @ts-ignore
function getAllPhotos() {
    return __awaiter(this, void 0, void 0, function* () {
        const url = 'http://localhost:8888/photos';
        const options = {
            method: 'GET',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include'
        };
        try {
            const res = yield fetch(url, options);
            const data = yield res.json();
            if (res.ok) {
                const photosList = document.getElementById('photosList');
                if (photosList) {
                    photosList.innerHTML = '';
                    if (data.length > 0) {
                        data.forEach((photo) => {
                            const photoItem = document.createElement('div');
                            photoItem.classList.add('photo-item', 'alert', 'alert-info');
                            photoItem.innerHTML = `
                            <img src="http://localhost:8888/photos/${photo.photoID}" alt="${photo.title}" style="max-width: 100px; max-height: 100px;">
                            <span class="photo-title" data-photo-id="${photo.photoID}">Title: ${photo.title}, Tags: ${photo.tags}</span>
                        `;
                            photosList.appendChild(photoItem);
                            photoItem.addEventListener('click', () => {
                                const photoIDInput = document.getElementById('photoID');
                                if (photoIDInput) {
                                    photoIDInput.value = photo.photoID.toString();
                                }
                            });
                        });
                    }
                    else {
                        photosList.textContent = "No photos found.";
                    }
                }
            }
            else {
                showMessage('photosList', 'Failed to retrieve photos', 'alert-danger');
            }
        }
        catch (error) {
            showMessage('photosList', 'Failed to retrieve photos', 'alert-danger');
        }
    });
}
/**
 * Alle Fotos eines bestimmten Albums anzeigen sowie die Option Fotos aus dem Album zu entfernen
 * @param albumID ID des Albums
 */
function getAllPhotosFromAlbum(albumID) {
    return __awaiter(this, void 0, void 0, function* () {
        const userID = getUserID();
        const url = `http://localhost:8888/${userID}/albums/${albumID}/photos`;
        const options = {
            method: 'GET',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include'
        };
        try {
            const res = yield fetch(url, options);
            const data = yield res.json();
            if (res.ok) {
                const photosList = document.getElementById('photosList');
                if (photosList) {
                    photosList.innerHTML = '';
                    if (data.length > 0) {
                        data.forEach((photo) => {
                            const photoItem = document.createElement('div');
                            photoItem.classList.add('photo-item', 'alert', 'alert-info');
                            photoItem.innerHTML = `
                            <img src="http://localhost:8888/photos/${photo.photoID}" alt="${photo.title}" style="max-width: 100px; max-height: 100px;">
                            <span class="photo-title" data-photo-id="${photo.photoID}">Title: ${photo.title}, Tags: ${photo.tags}</span>
                            <button class="remove-btn btn btn-danger btn-sm ml-2">Remove from Album</button>
                        `;
                            photosList.appendChild(photoItem);
                            const removeBtn = photoItem.querySelector('.remove-btn');
                            if (removeBtn) {
                                removeBtn.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                                    yield deletePhotoFromAlbum(albumID, photo.photoID);
                                    yield getAllPhotosFromAlbum(albumID);
                                }));
                            }
                        });
                    }
                    else {
                        photosList.textContent = "No photos in this album.";
                    }
                }
            }
            else {
                showMessage('photosList', 'Failed to retrieve album photos', 'alert-danger');
            }
        }
        catch (error) {
            showMessage('photosList', 'Failed to retrieve album photos', 'alert-danger');
        }
    });
}
/**
 * Fügt ein Foto zu einem Album hinzu
 * @param albumID ID des Albums
 * @param photoID ID des Fotos
 */
function addPhotoToAlbum(albumID, photoID) {
    return __awaiter(this, void 0, void 0, function* () {
        const userID = getUserID();
        const url = `http://localhost:8888/${userID}/albums/${albumID}/photos/${photoID}`;
        const options = {
            method: 'POST',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include'
        };
        yield handleFetch(url, options, 'result', 'Photo added to album successfully', 'Failed to add photo to album');
    });
}
/**
 * Entfernt ein Foto aus einem Album
 * @param albumID ID des Albums
 * @param photoID ID des Fotos
 */
function deletePhotoFromAlbum(albumID, photoID) {
    return __awaiter(this, void 0, void 0, function* () {
        const userID = getUserID();
        const url = `http://localhost:8888/${userID}/albums/${albumID}/photos/${photoID}`;
        const options = {
            method: 'DELETE',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include'
        };
        yield handleFetch(url, options, 'result', 'Photo removed from album successfully', 'Failed to remove photo from album');
    });
}
/**
 * Zeigt Form Element an um Albuminformationen zu bearbeiten
 * @param albumID ID des Albums
 * @param title Aktueller Titel des Albums
 * @param tags Aktuelle Tags des Albums
 */
// @ts-ignore
function showEditForm(albumID, title, tags) {
    const albumsList = document.getElementById('albumsList');
    if (albumsList) {
        albumsList.innerHTML = `
            <div class="alert alert-info">
                <strong>Selected Album:</strong> ${title}
            </div>
            <form id="editAlbumForm" class="mb-4">
                <div class="form-group">
                    <label for="newTitle">New Title:</label>
                    <input type="text" class="form-control" id="newTitle" name="newTitle" value="${title}" required>
                </div>
                <div class="form-group">
                    <label for="newTags">New Tags:</label>
                    <input type="text" class="form-control" id="newTags" name="newTags" value="${tags}">
                </div>
                <button type="submit" class="btn btn-warning btn-block">Edit Album</button>
            </form>
            <button id="cancelEditButton" class="btn btn-secondary btn-block mb-3">Cancel</button>
        `;
        const editAlbumForm = document.getElementById('editAlbumForm');
        const cancelEditButton = document.getElementById('cancelEditButton');
        if (editAlbumForm) {
            editAlbumForm.addEventListener('submit', (event) => __awaiter(this, void 0, void 0, function* () {
                event.preventDefault(); // Prevent the default form submission
                const newTitleInput = document.getElementById('newTitle');
                const newTagsInput = document.getElementById('newTags');
                if (newTitleInput && newTagsInput) {
                    const newTitle = newTitleInput.value;
                    const newTags = newTagsInput.value;
                    yield editAlbum(albumID, newTitle, newTags);
                    yield getAllAlbums();
                }
            }));
        }
        if (cancelEditButton) {
            cancelEditButton.addEventListener('click', () => {
                getAllAlbums();
            });
        }
    }
}
/**
 * Bearbeitet Albuminformationen
 * @param albumID ID des Albums
 * @param newTitle Neuer Titel des Albums
 * @param newTags Neue Tags des Albums
 */
function editAlbum(albumID, newTitle, newTags) {
    return __awaiter(this, void 0, void 0, function* () {
        const userID = getUserID();
        const url = `http://localhost:8888/${userID}/albums/${albumID}`;
        const options = {
            method: 'PUT',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include',
            body: JSON.stringify({ title: newTitle, tags: newTags })
        };
        yield handleFetch(url, options, 'result', 'Album updated successfully', 'Album update failed');
    });
}
/**
 * Löscht ein Album anhand der ID
 * @param albumID ID des Albums
 */
function deleteAlbum(albumID) {
    return __awaiter(this, void 0, void 0, function* () {
        const userID = getUserID();
        const url = `http://localhost:8888/${userID}/albums/${albumID}`;
        const options = {
            method: 'DELETE',
            mode: 'cors',
            headers: {
                "Content-type": "application/json"
            },
            credentials: 'include'
        };
        yield handleFetch(url, options, 'result', 'Album deleted successfully', 'Album deletion failed');
    });
}
/**
 * Initialisiere die event listener sobald das Dokument vollständig geladen wurde
 */
document.addEventListener('DOMContentLoaded', () => {
    const createAlbumForm = document.getElementById('createAlbumForm');
    const getAllAlbumsButton = document.getElementById('getAllAlbumsButton');
    const searchAlbumForm = document.getElementById('searchAlbumForm');
    const addPhotoForm = document.getElementById('addPhotoForm');
    const logoutButton = document.getElementById('logoutButton');
    if (createAlbumForm) {
        createAlbumForm.addEventListener('submit', (event) => __awaiter(void 0, void 0, void 0, function* () {
            event.preventDefault();
            const titleInput = document.getElementById('title');
            const tagsInput = document.getElementById('tags');
            if (titleInput) {
                const title = titleInput.value;
                const tags = tagsInput ? tagsInput.value : '';
                yield createAlbum(title, tags);
                yield getAllAlbums();
            }
        }));
    }
    if (getAllAlbumsButton) {
        getAllAlbumsButton.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
            yield getAllAlbums();
        }));
    }
    if (searchAlbumForm) {
        searchAlbumForm.addEventListener('submit', (event) => __awaiter(void 0, void 0, void 0, function* () {
            event.preventDefault();
            const searchTermInput = document.getElementById('searchTerm');
            if (searchTermInput) {
                const searchTerm = searchTermInput.value;
                yield searchAlbum(searchTerm);
            }
        }));
    }
    if (addPhotoForm) {
        addPhotoForm.addEventListener('submit', (event) => __awaiter(void 0, void 0, void 0, function* () {
            event.preventDefault();
            const photoIDInput = document.getElementById('photoID');
            const albumID = parseInt(addPhotoForm.dataset.albumId);
            if (photoIDInput && albumID) {
                const photoID = parseInt(photoIDInput.value);
                yield addPhotoToAlbum(albumID, photoID);
                yield getAllPhotosFromAlbum(albumID);
            }
        }));
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
            yield logout();
        }));
    }
    // weiterführende links auf der album management seite
    const userManagementLink = document.getElementById('userManagementLink');
    const photoManagementLink = document.getElementById('photoManagementLink');
    const albumManagementLink = document.getElementById('albumManagementLink');
    if (userManagementLink) {
        userManagementLink.addEventListener('click', () => {
            window.location.href = 'user-management.html';
        });
    }
    if (photoManagementLink) {
        photoManagementLink.addEventListener('click', () => {
            window.location.href = 'photo-management.html';
        });
    }
    if (albumManagementLink) {
        albumManagementLink.addEventListener('click', () => {
            window.location.href = 'album-management.html';
        });
    }
});
