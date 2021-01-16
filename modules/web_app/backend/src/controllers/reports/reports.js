
const Pool = require("pg").Pool;
const pool = new Pool({
    user: process.env.DB_USERNAME,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT
});

const getSimilarity = (request, response) => {
    // Issue 21.
    // TODO: Have not tested this query since databse has not been setup.
    const query = `
        SELECT *
        FROM public."SimilarityReport"
        JOIN Article A1 ON 
            public."SimilarityReport".sourceArticleId = A1.articleId
        JOIN Article A2 ON 
            public."SimilarityReport".targetArticleId = A2.articleId
        JOIN Vote V ON
            public."SimilarityReport".sourceArticleId = V.sourceArticleId
            AND
            public."SimilarityReport".targetArticleId = V.targetArticleId;
    `;
    pool.query(query, (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
};


export default {
    getSimilarity
};
