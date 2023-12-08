import "./styles.scss";
import { MusicalystData } from "./types/musicalyst";
import { camelize, replaceAll, waitForElement } from "./utils";

// https://developer.spotify.com/documentation/web-api
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/spotify-api/index.d.ts

export default async function main() {
	while (!Spicetify?.showNotification) {
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	let genreContainer = document.createElement("div");
	genreContainer.className = "main-trackInfo-genres";

	await injectGenres(genreContainer);
	Spicetify.Player.addEventListener("songchange", async () => {
		await injectGenres(genreContainer);
	});
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

	// Append genreContainer
	let infoContainer = await waitForElement("div.main-trackInfo-container", 3000);
	infoContainer?.appendChild(genreContainer);
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

	let data = await fetchMusicalyst(genre);

	Spicetify.PopupModal.display({
		title: camelize(genre),
		content: await createContent(data, playlist),
		isLarge: true,
	});
}

async function fetchMusicalyst(genre: string): Promise<MusicalystData> {
	let url = `https://serena-williams-certified-moment.github.io/gay-furry-porn/${replaceAll(genre, " ", "-")}.json`;
	console.log(url);
	let initialRequest = await fetch(url);
	let response = await initialRequest.json();
	return response.pageProps;
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

async function createContent(data: MusicalystData, playlist: SpotifyApi.PlaylistObjectFull): Promise<HTMLDivElement> {
	let contentContainer = document.createElement("div");
	contentContainer.className = "genre-description-container";
	contentContainer.appendChild(await createDescription(data));
	contentContainer.appendChild(await createRelated(data));
	contentContainer.appendChild(await createPlaylist(playlist));
	contentContainer.appendChild(await createTopArtists(data));
	return contentContainer;
}

async function createDescription(data: MusicalystData): Promise<HTMLDivElement> {
	let descriptionContainer = document.createElement("div");
	descriptionContainer.innerHTML = `<p>${data.genresAdvancedInfo.description}</p>`;
	return descriptionContainer;
}

async function createRelated(data: MusicalystData): Promise<HTMLDivElement> {
	let genreContainer = document.createElement("div");
	genreContainer.className = "related-genres-container";
	data.relatedGenres.forEach((relatedGenre) => {
		let genreTag = document.createElement("a");
		genreTag.className = "TypeElement-finale-textSubdued-type genre-tag";
		genreTag.innerHTML = camelize(relatedGenre.genre);
		genreTag.onclick = async () => {
			await clickGenreTag(relatedGenre.genre);
		};

		genreContainer.appendChild(genreTag);
	});

	return genreContainer;
}

async function createPlaylist(playlist: SpotifyApi.PlaylistObjectFull): Promise<HTMLDivElement> {
	let playlistContainer = document.createElement("div");
	playlistContainer.innerHTML = `
		<a href=${playlist.uri} onclick="Spicetify.PopupModal.hide()" class="playlist-container">
			<img src="${playlist.images[0].url}" class="playlist-image" />
			<div class="playlist-description">
				<h1 class="playlist-title">${playlist.name}</h1>
				<p class="playlist-stats">
					${playlist.owner.display_name} • ${playlist.followers.total} likes • ${playlist.tracks.total} songs
				</p>
			</div>
		</a>
	`;
	return playlistContainer;
}

async function createTopArtists(data: MusicalystData): Promise<HTMLDivElement> {
	let artists = () => {
		let result = "";
		data.topArtists.forEach(async (artist) => {
			let artistURI = `spotify:artist:${artist.id}`;
			result += `
				<a href=${artistURI} onclick="Spicetify.PopupModal.hide()" class="main-card-card">
					<div class="main-cardImage-imageWrapper">
						<img 
							class="main-image-image main-cardImage-image" 
							draggable=false
							loading="lazy" 
							src="${artist.images[2].url}"
						/>
					</div>
					<div class="main-cardHeader-text TypeElement-balladBold-textBase-type-paddingBottom_4px">
					    ${artist.name}
					</div>
				</a>
			`;
		});
		return result;
	};

	let topArtistsContainer = document.createElement("div");
	topArtistsContainer.innerHTML = `
		<div class="description-container">
			<h3 class="main-type-alto" as="h3">Top Artists</h3>
			<div class="main-gridContainer-gridContainer">
				${artists()}
			</div>
		</div>
	`;
	return topArtistsContainer;
}
