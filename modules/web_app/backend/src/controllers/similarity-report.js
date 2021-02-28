const Pool = require("pg").Pool;

const pool = new Pool({
  user: "admin",
  host: "3.1.100.54",
  database: "topdup_db",
  password: "uyL7WgydqKNkNMWe",
  port: "5432"
});

const getSimilarityRecords = async (request, response) => {
  const getSimReportsQuery = `
    SELECT 
      SR.id as id,
      A1.title as article_a, 
      A1.domain as domain_a,
      A1.author as author_a, 
      A1.created_date as created_date_a,
      A2.title as article_b, 
      A2.domain as domain_b,
      A2.author as author_b, 
      A2.created_date as created_date_b,
      SR.sim_score as sim_score	
    FROM public.similarity_report SR
    LEFT JOIN ARTICLE A1 ON A1.id = SR.article_a_id
    LEFT JOIN ARTICLE A2 ON A2.id = SR.article_b_id
  `;

  const getVotesQuery = `SELECT * FROM public.vote`

  const getSimReportsRes = await pool.query(getSimReportsQuery)
  const getVotesRes = await pool.query(getVotesQuery);
  const simReports = getSimReportsRes.rows;
  const votes = getVotesRes.rows;

  const results = simReports.map(report => {
    const userId = 25
    const voteRecords = votes.filter(vote => vote['article_a_id'] === report['article_a_id'] && vote['article_b_id'] === report['article_b_id']) 
    const articleAVotes = voteRecords.filter(vote => vote['voted_option'] === 1)
    const articleBVotes = voteRecords.filter(vote => vote['voted_option'] === 2)
    const errorVotes = voteRecords.filter(vote => vote['voted_option'] === 3)
    const irrelevantVotes = voteRecords.filter(vote => vote['voted_option'] === 4)
    const foundVote = voteRecords.find(vote => vote.userId === userId)
    
    return {
      id: report["id"],
      articleA: report["article_a"],
      domainA: report["domain_a"],
      authorA: report["author_a"],
      createdDateA: report["created_date_a"],
      articleB: report["article_b"],
      domainB: report["domain_b"],
      authorB: report["author_b"],
      createdDateB: report["created_date_b"],
      articleANbVotes: articleAVotes.length,
      articleBNbVotes: articleBVotes.length,
      errorNbVotes: errorVotes.length,
      irrelevantNbVotes: irrelevantVotes.length,
      simScore: report["sim_score"],
      userVoted: foundVote !== undefined,
      votedOption: foundVote && foundVote['voted_option']
    };
  })
  response.status(200).json(results);
};

export default {
  getSimilarityRecords
};
