export type MusicalystData = {
	genreid: string;
	genresAdvancedInfo: GenresAdvancedInfo;
	topArtists: TopArtists[];
};

export type GenresAdvancedInfo = {
	id: string;
	name: string;
	description: string;
	playlists: string[];
};

export type TopArtists = {
	id: string;
	name: string;
	images: TopArtistsImage[];
};

export type TopArtistsImage = {
	width: number;
	height: number;
	url: string;
};
