import { CODE } from "../constants/index.js"
import createPool from "./pool.js"

const pool = createPool(
  process.env.POOL_HOST,
  process.env.POOL_DB_NAME,
  process.env.POOL_USR,
  process.env.POOL_PWD
)

const getSimRecordById = async (id, userId) => {
  const simReportsQuery = `
      SELECT *  
      FROM public.similar_docs SD
      WHERE SD.sim_id = '${ id }'
    `
  const simReportRes = await pool.query(simReportsQuery)
  const foundSimReport = simReportRes && simReportRes.rows && simReportRes.rows[0]

  console.log('foundSimReport', foundSimReport)

  if (!foundSimReport) {
    next(Error(`Sim report found with id ${ id }`))
    return
  }

  const articleAId = foundSimReport['document_id_A']
  const articleBId = foundSimReport['document_id_B']
  const voteRes = await pool.query(`SELECT * FROM public.vote WHERE article_a_id = '${ articleAId }' AND article_b_id = '${ articleBId }'`)
  const voteRecords = (voteRes && voteRes.rows) || []
  const articleAVotes = voteRecords.filter(vote => vote['voted_option'] === 1)
  const articleBVotes = voteRecords.filter(vote => vote['voted_option'] === 2)
  const errorVotes = voteRecords.filter(vote => vote['voted_option'] === 3)
  const irrelevantVotes = voteRecords.filter(vote => vote['voted_option'] === 4)
  const foundVote = voteRecords.find(vote => vote.userId === userId)

  return {
    id: foundSimReport["sim_id"],
    articleA: foundSimReport["title_A"],
    articleAId: foundSimReport["document_id_A"],
    domainA: foundSimReport["domain_A"],
    urlA: foundSimReport["url_A"],
    createdDateA: foundSimReport["published_date_A"],
    articleB: foundSimReport["title_B"],
    articleBId: foundSimReport["document_id_B"],
    domainB: foundSimReport["domain_B"],
    urlB: foundSimReport["url_B"],
    createdDateB: foundSimReport["published_date_B"],
    articleANbVotes: articleAVotes.length,
    articleBNbVotes: articleBVotes.length,
    errorNbVotes: errorVotes.length,
    irrelevantNbVotes: irrelevantVotes.length,
    simScore: foundSimReport["sim_score"],
    userVoted: foundVote !== undefined,
    voteId: foundVote && foundVote.id,
    votedOption: foundVote && foundVote['voted_option']
  }
}

const getSimilarityRecords = async (request, response) => {
  const userId = request.query.userId
  const getSimReportsQuery = `
      SELECT * 
      FROM public.similar_docs 
      ORDER BY sim_score DESC
    `
  const getVotesQuery = `SELECT * FROM public.vote`
  const getSimReportsRes = await pool.query(getSimReportsQuery)
  const getVotesRes = await pool.query(getVotesQuery)
  const simReports = getSimReportsRes.rows
  const votes = getVotesRes.rows

  const results = simReports.map(report => {
    const voteRecords = votes.filter(vote => vote['article_a_id'] === report['document_id_A'] && vote['article_b_id'] === report['document_id_B'])
    const articleAVotes = voteRecords.filter(vote => vote['voted_option'] === 1)
    const articleBVotes = voteRecords.filter(vote => vote['voted_option'] === 2)
    const errorVotes = voteRecords.filter(vote => vote['voted_option'] === 3)
    const irrelevantVotes = voteRecords.filter(vote => vote['voted_option'] === 4)
    const foundVote = voteRecords.find(vote => vote['user_id'] === userId)

    return {
      id: report["sim_id"],
      articleA: report["title_A"],
      articleAId: report["document_id_A"],
      domainA: report["domain_A"],
      urlA: report["url_A"],
      createdDateA: report["publish_date_A"],
      articleB: report["title_B"],
      articleBId: report["document_id_B"],
      domainB: report["domain_B"],
      urlB: report["url_B"],
      createdDateB: report["publish_date_B"],
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
  response.status(CODE.SUCCESS).json(results)
}

const applyVote = async (request, response) => {
  console.log(request.body)
  const { simReport, votedOption, userId } = request.body
  const { articleAId, articleBId, voteId, userVoted } = simReport
  var today = new Date()
  var createdDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000))
    .toISOString()
    .split("T")[0]

  const query = userVoted
    ? `UPDATE public.vote SET voted_option = ${ votedOption } WHERE id = ${ voteId }`
    : `
        INSERT INTO public.vote (article_a_id, article_b_id, voted_option, user_id, created_date)
        VALUES ('${ articleAId }', '${ articleBId }', ${ votedOption }, ${ userId }, '${ createdDate }')
      `
  await pool.query(query)
  const updateSimReport = await getSimRecordById(simReport.id)
  response.status(200).json(updateSimReport)
}

export default {
  getSimilarityRecords,
  applyVote
}
