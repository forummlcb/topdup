const Pool = require("pg").Pool;
const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'topdup_db',
  password: 'admin',
  port: 5432
});

const getSimilarityRecords = (request, response) => {
  const query = `
        SELECT *
        FROM public."similarity_report"
    `;
  pool.query(query, (error, results) => {
    if (error) {
      throw error;
    }
    response.status(200).json(results.rows);
  });
};

export default {
  getSimilarityRecords
};
