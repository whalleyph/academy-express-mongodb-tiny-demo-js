import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import morgan from "morgan";

// ------------------------------------------------------------------------
//-- Setup
// ------------------------------------------------------------------------
//load any env vars from .env file(s) into process.env
dotenv.config();

const app = express();

//allow morgan logger to get access to each request before and after our handlers
app.use(morgan("dev"));
//auto-include CORS headers to allow consumption of our content by in-browser js loaded from elsewhere
app.use(cors());
//parse body text of requests having content-type application/json, attaching result to `req.body`
app.use(express.json());

//setup connection to mongodb
const databaseURL = getEnvironmentVariableOrFail("DATABASE_URL");
const mongoClient = new MongoClient(databaseURL);

// ------------------------------------------------------------------------
//-- Route handlers
// ------------------------------------------------------------------------
app.get("/movies", async (req, res) => {
    const database = mongoClient.db("sample_mflix");
    const movies = database.collection("movies");

    const movieResults = await movies.find().limit(10).toArray();

    res.json(movieResults);
});

app.post("/movies", async (req, res) => {
    //TODO: You would validate user-submitted data before allowing it into our system!
    const candidateMovie = req.body;
    const database = mongoClient.db("sample_mflix");
    const movies = database.collection("movies");

    const insertionResults = await movies.insertOne(candidateMovie);

    res.json(insertionResults);
});

//e.g. /movies/search?searchTerm=blah
app.get("/movies/search", async (req, res) => {
    const searchTerm = "" + req.query.searchTerm;
    const database = mongoClient.db("sample_mflix");
    const movies = database.collection("movies");

    const movieResults = await movies
        .find({ title: { $regex: searchTerm, $options: "i" } })
        .toArray();

    const simplifiedResults = movieResults.map(simplifyMovie);
    res.json(simplifiedResults);
});

//e.g. /movies/573a1398f29313caabce9682
app.get("/movies/:id", async (req, res) => {
    const database = mongoClient.db("sample_mflix");
    const movies = database.collection("movies");

    const movie = await movies.findOne({ _id: new ObjectId(req.params.id) });

    res.json(movie);
});

//use the environment variable PORT, or 4000 as a fallback
const PORT = process.env.PORT ?? 4000;

app.listen(PORT, () => {
    console.log(
        `Your express app started listening on ${PORT}, at ${new Date()}`
    );
});

// ------------------------------------------------------------------------
//-- Supporting code. In a larger app these fns would go in different files
// ------------------------------------------------------------------------
function getEnvironmentVariableOrFail(soughtVariableName) {
    const foundValue = process.env[soughtVariableName];

    if (!foundValue) {
        throw new Error(
            `Could not find environment variable with key: ${soughtVariableName}.  Have you set it?`
        );
    }
    return foundValue;
}

/**
 * Returns a new simplified movie object having only a few of the fields from the original full movie object.  No fields are renamed.
 * Note this is not required to use mongodb - it's just that the objects in their sample mflix database have LOTS of fields and can be unwieldy.
 * @param {object} fullMovieObject
 * @returns {object} a new simplified object with some of the same fields copied over from the input object.
 */
function simplifyMovie(fullMovieObject) {
    const { title, _id, plot, released, imdb, type } = fullMovieObject;
    return { title, _id, plot, released, imdb, type };
}
