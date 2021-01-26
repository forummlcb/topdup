const Pool = require("pg").Pool;
const pool = new Pool({
  user: 'admin',
  host: '3.1.100.54',
  database: 'topdup_db',
  password: 'uyL7WgydqKNkNMWe',
  port: 5432
});

const getSimilarityRecords = (request, response) => {
  const query = `
      SELECT  article_a.title as article_a_title, 
              article_a.domain as article_a_domain,
              article_a.author as article_a_author,
              article_a.last_updated_date as article_a_last_updated_date,
              s_report.sim_score as sim_score,
              article_b.title as article_b_title, 
              article_b.domain as article_b_domain,
              article_b.author as article_b_author,
              article_b.last_updated_date as article_b_last_updated_date
      FROM public."similarity_report" as s_report
      INNER JOIN public."article" as article_a ON article_a.id = s_report.article_a_id
      INNER JOIN public."article" as article_b ON article_b.id = s_report.article_b_id    
      ORDER BY sim_score DESC;
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
