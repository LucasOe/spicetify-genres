import "./styles.scss";
import { camelize, waitForElement } from "./utils";

// https://developer.spotify.com/documentation/web-api
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/spotify-api/index.d.ts

export default async function main() {
	while (!Spicetify?.showNotification) {
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	let genreContainer = createGenreContainer();

	await injectGenres(genreContainer);
	await appendGenreContainer(genreContainer);

	Spicetify.Player.addEventListener("songchange", async () => {
		await injectGenres(genreContainer);
		await appendGenreContainer(genreContainer);
	});
}

function createGenreContainer(): HTMLDivElement {
	let genreContainer = document.createElement("div");
	genreContainer.className = "main-trackInfo-genres";
	return genreContainer;
}

async function appendGenreContainer(genreContainer: HTMLDivElement) {
	let infoContainer = await waitForElement("div.main-trackInfo-container", 3000);
	infoContainer?.appendChild(genreContainer);
}

async function injectGenres(genreContainer: HTMLDivElement) {
	let artist_uri = getArtistsURI();
	if (!artist_uri) return;

	let artistGenres = await fetchGenres(artist_uri);

	// Clear elements inside genreContainer
	genreContainer.innerHTML = "";

	// Append genreTag
	artistGenres.forEach(async (genre) => {
		let genreTag = document.createElement("a");
		genreTag.className = "TypeElement-finale-textSubdued-type genre-tag";
		genreTag.innerHTML = camelize(genre);
		genreTag.onclick = async () => {
			await clickGenreTag(genre);
		};

		genreContainer.appendChild(genreTag);
	});
}

function getArtistsURI(): string | null {
	let data = Spicetify.Player.data;
	if (!Spicetify.Player.data) return null;
	return data.item.metadata.artist_uri.split(":")[2];
}

async function fetchGenres(artistURI: string): Promise<string[]> {
	const res: SpotifyApi.SingleArtistResponse = await Spicetify.CosmosAsync.get(
		`https://api.spotify.com/v1/artists/${artistURI}`
	);
	return res.genres;
}

async function clickGenreTag(genre: string) {
	let playlist = await fetchSpotifyPlaylistURI(genre);
	if (!playlist) return;

	let descriptionContainer = document.createElement("div");
	descriptionContainer.className = "genre-description-container";
	descriptionContainer.appendChild(createPlaylistContainer(playlist));

	Spicetify.PopupModal.display({
		title: camelize(genre),
		content: descriptionContainer,
		isLarge: true,
	});
}

async function fetchSpotifyPlaylistURI(genre: string): Promise<SpotifyApi.SinglePlaylistResponse | void> {
	let name = `The Sound of ${camelize(genre)}`;
	const searchResponse: SpotifyApi.PlaylistSearchResponse = await Spicetify.CosmosAsync.get(
		`https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=playlist`
	);

	for (const item of searchResponse.playlists.items) {
		if (item.owner.id == "thesoundsofspotify" && item.name == name) {
			return Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/playlists/${item.id}`);
		}
	}

	Spicetify.showNotification(`Couldn't find playlist: ${name}`);
	return;
}

function createPlaylistContainer(playlist: SpotifyApi.PlaylistObjectFull): HTMLAnchorElement {
	let playlistContainer = document.createElement("a");
	playlistContainer.className = "playlist-description-container";
	playlistContainer.href = playlist.uri;
	playlistContainer.appendChild(createPlaylistImage(playlist));
	playlistContainer.appendChild(createPlaylistDescription(playlist));
	return playlistContainer;
}

function createPlaylistImage(playlist: SpotifyApi.PlaylistObjectFull): HTMLImageElement {
	let playlistImage = document.createElement("img");
	playlistImage.src = playlist.images[0].url;
	playlistImage.className = "main-entityHeader-image playlist-image";
	return playlistImage;
}

function createPlaylistDescription(playlist: SpotifyApi.PlaylistObjectFull): HTMLDivElement {
	let playlistDescription = document.createElement("div");
	playlistDescription.innerHTML = `
		<h1 class="playlist-title">${playlist.name}</h1>
		<p class="playlist-description">${playlist.owner.display_name} • ${playlist.followers.total} likes • ${playlist.tracks.total} songs</p>
	`;
	return playlistDescription;
}
