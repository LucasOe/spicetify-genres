import marquee from "vanilla-marquee";
import "./styles.scss";
import { MusicalystData } from "./types/musicalyst";
import { camelize, debounce, replaceAll, waitForElement } from "./utils";

// https://developer.spotify.com/documentation/web-api
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/spotify-api/index.d.ts

let marq: marquee | undefined;
let cachedGenres: string[];

export default async function main() {
	while (!Spicetify?.showNotification) {
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	let genreContainer = document.createElement("div");
	genreContainer.className = "main-trackInfo-genres";

	// await injectGenres(genreContainer);
	Spicetify.Player.addEventListener("songchange", async () => {
		await injectGenres(genreContainer);
	});

	// Remove or add marquee on resize
	window.addEventListener("resize", () => {
		// Make genreContainer a marquee if there is a line break
		if (!marq && genreContainer.offsetHeight > 22) {
			genreContainer.classList.add("marquee");
			marq = new marquee(genreContainer, {
				speed: 50,
				gap: 0,
				duplicated: true,
				startVisible: true,
				pauseOnHover: true,
				delayBeforeStart: 0,
			});
		}
	});
	window.addEventListener(
		"resize",
		debounce(async () => {
			await injectGenres(genreContainer, cachedGenres);
		})
	);

	window.dispatchEvent(new Event("resize"));
}

async function injectGenres(genreContainer: HTMLDivElement, genres?: string[]) {
	let artist_uri = getArtistsURI();
	if (!artist_uri) return;

	let artistGenres = genres ?? (await fetchGenres(artist_uri));
	cachedGenres = artistGenres;

	// Clear elements inside genreContainer
	genreContainer.className = "main-trackInfo-genres";
	genreContainer.innerHTML = "";
	marq = undefined;

	// Append genreTag
	for (const genre of artistGenres) {
		let genreTag = document.createElement("a");
		genreTag.className = "TextElement-marginal-textSubdued-text encore-text-marginal genre-tag";
		genreTag.innerHTML = camelize(genre);
		genreTag.setAttribute("genre", genre);
		genreTag.addEventListener("click", () => {
			clickGenreTag(genre);
		});

		genreContainer.appendChild(genreTag);
	}

	// Make genreContainer a marquee if there is a line break
	// We observe when the genreContainer is rendered so we guarrantee that offsetHeight is never 0
	const resizeObserver = new ResizeObserver(() => {
		if (genreContainer.offsetHeight > 22) {
			genreContainer.classList.add("marquee");
			marq = new marquee(genreContainer, {
				speed: 50,
				gap: 0,
				duplicated: true,
				startVisible: true,
				pauseOnHover: true,
				delayBeforeStart: 0,
			});

			// References are lost if a marquee is created, that's why we use getElementsByClassName
			for (const genreTag of document.getElementsByClassName("genre-tag")) {
				const genre = genreTag.getAttribute("genre");
				if (genre) {
					genreTag.addEventListener("click", () => clickGenreTag(genre));
				}
			}
		}

		resizeObserver.disconnect();
	});
	resizeObserver.observe(genreContainer);

	// Append genreContainer
	let infoContainer = await waitForElement(".main-nowPlayingWidget-trackInfo", 3000);
	infoContainer?.appendChild(genreContainer);
}

function getArtistsURI(): string | null {
	let data = Spicetify.Player.data;
	if (!data) return null;
	return data.item.metadata.artist_uri.split(":")[2];
}

async function fetchGenres(artistURI: string): Promise<string[]> {
	const res: SpotifyApi.SingleArtistResponse = await Spicetify.CosmosAsync.get(
		`https://api.spotify.com/v1/artists/${artistURI}?locale=EN_en`
	);
	return res.genres;
}

async function clickGenreTag(genre: string) {
	// Show Skeleton while loading
	let skeleton = document.createElement("div");
	skeleton.className = "genre-description-container";
	skeleton.innerHTML = /* HTML */ `
		<div class="skeleton" style="height: 144px;"></div>
		<div class="skeleton" style="height: 86px;"></div>
		<div class="skeleton" style="height: calc(75vh - 375px);"></div>
	`;

	Spicetify.PopupModal.display({
		title: camelize(genre),
		content: skeleton,
		isLarge: true,
	});

	let playlist = await fetchSpotifyPlaylistURI(genre);
	let data = await fetchMusicalyst(genre);

	if (!data) {
		Spicetify.PopupModal.hide();
		return;
	}

	// Check if the skeleton still exist to display the content
	if (document.querySelector("div.genre-description-container")) {
		Spicetify.PopupModal.display({
			title: camelize(genre),
			content: await createContent(data, playlist),
			isLarge: true,
		});
	}
}

async function fetchMusicalyst(genre: string): Promise<MusicalystData | void> {
	let escaped = replaceAll(replaceAll(genre, " ", "-"), ":", "");
	let url = `https://lucasoe.github.io/spicetify-genres/api/${escaped}.json`;
	try {
		let initialRequest = await fetch(url);
		let response = await initialRequest.json();
		return response.pageProps;
	} catch {
		Spicetify.showNotification(`Couldn't find genre on Musicalyst: ${camelize(genre)}`);
		return;
	}
}

async function fetchSpotifyPlaylistURI(genre: string): Promise<SpotifyApi.SinglePlaylistResponse | void> {
	let name = `The Sound of ${camelize(genre)}`;
	const searchResponse: SpotifyApi.PlaylistSearchResponse = await Spicetify.CosmosAsync.get(
		`https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=playlist&limit=50`
	);

	for (const item of searchResponse.playlists.items) {
		console.log(item.name.toLowerCase(), name.toLowerCase());
		if (item.owner.id == "thesoundsofspotify" && item.name.toLowerCase() == name.toLowerCase()) {
			return Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/playlists/${item.id}`);
		}
	}

	Spicetify.showNotification(`Couldn't find playlist: ${name}`);
	return;
}

async function createContent(
	data: MusicalystData,
	playlist: SpotifyApi.PlaylistObjectFull | void
): Promise<HTMLDivElement> {
	let contentContainer = document.createElement("div");
	contentContainer.className = "genre-description-container";
	contentContainer.appendChild(await createDescription(data));
	contentContainer.appendChild(await createRelated(data));
	if (playlist) contentContainer.appendChild(await createPlaylist(playlist));
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
		let genreTag = document.createElement("div");
		genreTag.className = "TextElement-marginal-textSubdued-text encore-text-marginal genre-tag";
		genreTag.innerHTML = camelize(relatedGenre.genre);
		genreTag.onclick = async () => {
			await new Promise((resolve) => setTimeout(resolve, 100));
			await clickGenreTag(relatedGenre.genre);
		};

		genreContainer.appendChild(genreTag);
	});

	return genreContainer;
}

async function createPlaylist(playlist: SpotifyApi.PlaylistObjectFull): Promise<HTMLDivElement> {
	let playlistContainer = document.createElement("div");
	playlistContainer.innerHTML = /* HTML */ `
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
			result += /* HTML */ `
				<a href=${artistURI} onclick="Spicetify.PopupModal.hide()" class="main-card-card">
					<div class="main-cardImage-imageWrapper">
						<img
							class="main-image-image main-cardImage-image"
							draggable="false"
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
	topArtistsContainer.innerHTML = /* HTML */ `
		<div class="description-container">
			<h2 class="main-type-alto" as="h2">Top Artists</h2>
			<div class="main-gridContainer-gridContainer">${artists()}</div>
		</div>
	`;
	return topArtistsContainer;
}
