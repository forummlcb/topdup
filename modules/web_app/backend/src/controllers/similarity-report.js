
const Pool = require("pg").Pool

const pool = new Pool({
  user: "admin",
  host: "3.1.100.54",
  database: "topdup_db",
  password: "uyL7WgydqKNkNMWe",
  port: "5432"
})

const getSimRecordById = async (id, userId) => {
  try {
    const simReportsQuery = `
      SELECT 
        SR.id as id,
        A1.title as article_a,
        A1.id as article_a_id, 
        A1.domain as domain_a,
        A1.author as author_a, 
        A1.created_date as created_date_a,
        A2.title as article_b,
        A2.id as article_b_id, 
        A2.domain as domain_b,
        A2.author as author_b, 
        A2.created_date as created_date_b,
        SR.sim_score as sim_score	
      FROM public.similarity_report SR
      LEFT JOIN ARTICLE A1 ON A1.id = SR.article_a_id
      LEFT JOIN ARTICLE A2 ON A2.id = SR.article_b_id
      WHERE SR.id = ${id}
    `
    const simReportRes = await pool.query(simReportsQuery)
    const foundSimReport = simReportRes && simReportRes.rows && simReportRes.rows[0]

    console.log('foundSimReport', foundSimReport)

    if (!foundSimReport) return

    const articleAId = foundSimReport['article_a_id']
    const articleBId = foundSimReport['article_b_id']
    const voteRes = await pool.query(`SELECT * FROM public.vote WHERE article_a_id = ${articleAId} AND article_b_id = ${articleBId}`)
    const voteRecords = (voteRes && voteRes.rows) || []
    const articleAVotes = voteRecords.filter(vote => vote['voted_option'] === 1)
    const articleBVotes = voteRecords.filter(vote => vote['voted_option'] === 2)
    const errorVotes = voteRecords.filter(vote => vote['voted_option'] === 3)
    const irrelevantVotes = voteRecords.filter(vote => vote['voted_option'] === 4)
    const foundVote = voteRecords.find(vote => vote.userId === userId)

    return {
      id: foundSimReport["id"],
      articleA: foundSimReport["article_a"],
      articleAId: foundSimReport["article_a_id"],
      domainA: foundSimReport["domain_a"],
      authorA: foundSimReport["author_a"],
      createdDateA: foundSimReport["created_date_a"],
      articleB: foundSimReport["article_b"],
      articleBId: foundSimReport["article_b_id"],
      domainB: foundSimReport["domain_b"],
      authorB: foundSimReport["author_b"],
      createdDateB: foundSimReport["created_date_b"],
      articleANbVotes: articleAVotes.length,
      articleBNbVotes: articleBVotes.length,
      errorNbVotes: errorVotes.length,
      irrelevantNbVotes: irrelevantVotes.length,
      simScore: foundSimReport["sim_score"],
      userVoted: foundVote !== undefined,
      voteId: foundVote && foundVote.id,
      votedOption: foundVote && foundVote['voted_option']
    }
  } catch (error) {
    throw (error)
  }
}

const getSimilarityRecords = async (request, response) => {
  const userId = request.query.userId
  const getSimReportsQuery = `
    SELECT 
      SR.id as id,
      A1.title as article_a,
      A1.id as article_a_id, 
      A1.domain as domain_a,
      A1.author as author_a, 
      A1.created_date as created_date_a,
      A2.title as article_b,
      A2.id as article_b_id, 
      A2.domain as domain_b,
      A2.author as author_b, 
      A2.created_date as created_date_b,
      SR.sim_score as sim_score	
    FROM public.similarity_report SR
    LEFT JOIN ARTICLE A1 ON A1.id = SR.article_a_id
    LEFT JOIN ARTICLE A2 ON A2.id = SR.article_b_id
  `

  const getVotesQuery = `SELECT * FROM public.vote`

  const getSimReportsRes = await pool.query(getSimReportsQuery)
  const getVotesRes = await pool.query(getVotesQuery)
  const simReports = getSimReportsRes.rows
  const votes = getVotesRes.rows

  const results = simReports.map(report => {
    const voteRecords = votes.filter(vote => vote['article_a_id'] === report['article_a_id'] && vote['article_b_id'] === report['article_b_id'])
    const articleAVotes = voteRecords.filter(vote => vote['voted_option'] === 1)
    const articleBVotes = voteRecords.filter(vote => vote['voted_option'] === 2)
    const errorVotes = voteRecords.filter(vote => vote['voted_option'] === 3)
    const irrelevantVotes = voteRecords.filter(vote => vote['voted_option'] === 4)
    const foundVote = voteRecords.find(vote => vote['user_id'] === userId)

    return {
      id: report["id"],
      articleA: report["article_a"],
      articleAId: report["article_a_id"],
      domainA: report["domain_a"],
      authorA: report["author_a"],
      createdDateA: report["created_date_a"],
      articleB: report["article_b"],
      articleBId: report["article_b_id"],
      domainB: report["domain_b"],
      authorB: report["author_b"],
      createdDateB: report["created_date_b"],
      articleANbVotes: articleAVotes.length,
      articleBNbVotes: articleBVotes.length,
      errorNbVotes: errorVotes.length,
      irrelevantNbVotes: irrelevantVotes.length,
      simScore: report["sim_score"],
      userVoted: foundVote !== undefined,
      voteId: foundVote && foundVote.id,
      votedOption: foundVote && foundVote['voted_option']
    }
  })
  response.status(200).json(results)
}

const applyVote = async (request, response) => {
  try {
    console.log(request.body)
    const { simReport, votedOption, userId } = request.body
    const { articleAId, articleBId, voteId, userVoted } = simReport
    var today = new Date()
    var createdDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000))
      .toISOString()
      .split("T")[0]

    const query = userVoted
      ? `UPDATE public.vote SET voted_option = ${votedOption} WHERE id = ${voteId}`
      : `
        INSERT INTO public.vote (article_a_id, article_b_id, voted_option, user_id, created_date) 
        VALUES (${articleAId}, ${articleBId}, ${votedOption}, ${userId}, '${createdDate}')
      `
    console.log('query', query)
    await pool.query(query)
    const updateSimReport = await getSimRecordById(simReport.id)
    console.log('updateSimReport', updateSimReport)
    response.status(200).json(updateSimReport)
  } catch (error) {
    throw error
  }
}

export default {
  getSimilarityRecords,
  applyVote
}
