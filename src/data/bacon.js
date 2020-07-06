require("dotenv").config();
const {v3} = require('@leonardocabeza/the-movie-db');
const tmdb = v3(process.env.TheMovieDBKey);
const cache = require('./cache');

async function getShortestPaths(actorNames) {
	const personToMovies = {};
	const nodesToExamine = [];
	for (const actorName of actorNames) {
		const person = await getPerson(actorName);
		personToMovies[person.id] = undefined;
		nodesToExamine.push(person);
	}
	let commonMovies = getCommonMovies(personToMovies);
	while (commonMovies.size < 1) {
		for (person in personToMovies) {
			if (personToMovies[person] === undefined) {
				personToMovies[person] = await getMovies(person);
			}
		}
		commonMovies = getCommonMovies(personToMovies);
	}
	return getPaths(actorNames, commonMovies);
}

function getPaths(actorNames, commonMovies) {
	logFunctionCall(arguments.callee, arguments);
	const result = {
		nodes: [],
		links: []
	};
	for (actorName of actorNames) {
		result.nodes.push({ id: actorName, group: 1 });
		for (movieJSON of commonMovies) {
			const movie = JSON.parse(movieJSON);
			result.links.push({
				source: actorName,
				target: movie.name,
				value: 1
			});
		}
	}
	for (movieJSON of commonMovies) {
		const movie = JSON.parse(movieJSON);
		result.nodes.push({ id: movie.name, group: 2 });
	}
	return result;
}

function getCommonMovies(personToMovies) {
	const personIds = Object.keys(personToMovies);
	let arrayOfMovies = personToMovies[personIds[0]];
	if (arrayOfMovies === undefined) return new Set();
	let commonMovies = new Set(arrayOfMovies.map(x => JSON.stringify(x)));
	for (let i = 1; i < personIds.length; ++i) {
		const movies = personToMovies[personIds[i]];
		commonMovies = new Set(
			movies
				.filter(x => commonMovies.has(JSON.stringify(x)))
				.map(x => JSON.stringify(x))
		);
	}
	return commonMovies;
}

async function getMovies(personId) {
	const data = await cache('tmdb/credits/person', personId, tmdb.people.movieCredits); // combinedCredits
	if (data && data.cast && data.cast.length) return data.cast.map((movie) => ({
		type: "movie",
		id: movie.id,
		name: movie.original_title || movie.title,
	}));
	return {};
}

async function getPeople(movieId) {
	const data = await cache('tmdb/credits/movie', movieId, tmdb.movie.credits);
	if (data && data.cast && data.cast.length) return data.cast.map((person) => ({
		type: "person",
		id: person.id,
		name: person.name,
	}));
	return {};
}

module.exports = getShortestPaths;

async function test() {
	console.log(await getPeople(551));
	console.log(await getMovies(193));
}

test();
