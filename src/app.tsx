import "./styles.scss";
import { waitForElement } from "./utils";

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
	let artistGenres = await fetchGenres(artist_uri);

	// Clear elements inside genreContainer
	genreContainer.innerHTML = "";

	// Append genreTag
	artistGenres.forEach(async (genre) => {
		let genreTag = document.createElement("span");
		genreTag.className = "TypeElement-finale-textSubdued-type";
		genreTag.innerHTML = genre;
		genreContainer.appendChild(genreTag);
	});
}

function getArtistsURI(): string {
	let metadata = Spicetify.Player.data?.item.metadata;
	return metadata.artist_uri.split(":")[2];
}

async function fetchGenres(artistURI: string): Promise<string[]> {
	const res = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/artists/${artistURI}`);
	return res.genres;
}
