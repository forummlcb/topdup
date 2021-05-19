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
    userId: userId,
    voteId: foundVote && foundVote.id,
    votedOption: foundVote && foundVote['voted_option']
  }
}

const getSimilarityRecords = async (request, response) => {
  const startPoint = request.query.startPoint
  const limit = request.query.limit
  const userId = request.query.userId
  const getSimReportsQuery = `
    select sub_sm.*, v2.user_id, v2.voted_option, v2.id as vote_id
    from (
        select sm.*, withCount.nb_vote_for_a, withCount.nb_vote_for_b, withCount.nb_vote_error, withCount.nb_vote_irrelevant
        from
            (
                select "document_id_A",
                      "document_id_B",
                      count(v1.id) filter (where v1.voted_option = 1) as nb_vote_for_a,
                      count(v1.id) filter (where v1.voted_option = 2) as nb_vote_for_b,
                      count(v1.id) filter (where v1.voted_option = 3) as nb_vote_error,
                      count(v1.id) filter (where v1.voted_option = 4) as nb_vote_irrelevant
                from similar_docs sm
                    left join vote v1 on v1.article_a_id = sm."document_id_A" and v1.article_b_id = sm."document_id_B"
                group by sm."document_id_A", sm."document_id_B"
            ) withCount,
            similar_docs sm
        where sm."document_id_A" = withCount."document_id_A" and sm."document_id_B" = withCount."document_id_B"
        limit ${limit }
        offset ${startPoint }
    ) sub_sm
    left join vote v2 on v2.article_a_id = sub_sm."document_id_A" and v2.article_b_id = sub_sm."document_id_B" and ${ userId ? 'v2.user_id = ' + userId : 'False' }
  `
  const countItemsQuery = `
    SELECT COUNT(*) AS nb_items
    FROM public.similar_docs    
  `

  const getSimReportsRes = await pool.query(getSimReportsQuery)
  const getItemCount = await pool.query(countItemsQuery)

  const simReports = getSimReportsRes.rows
  const totalNbReports = getItemCount.rows && getItemCount.rows[0] && getItemCount.rows[0]['nb_items']

  const reportItems = simReports.map(report => {
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
      articleANbVotes: report["nb_vote_for_a"],
      articleBNbVotes: report["nb_vote_for_b"],
      errorNbVotes: report["nb_vote_error"],
      irrelevantNbVotes: report["nb_vote_irrelevant"],
      simScore: parseFloat(report["sim_score"]).toFixed(3),
      userVoted: userId && report["user_id"],
      userId: userId && parseInt(userId),
      voteId: report['vote_id'],
      votedOption: report['voted_option']
    }
  })

  response.status(CODE.SUCCESS).json({
    reports: reportItems,
    totalNbReports: totalNbReports
  })
}

const applyVote = async (request, response) => {
  console.log(request.body)
  const { simReport, votedOption, userId } = request.body
  const { articleAId, articleBId, voteId, userVoted } = simReport
  var today = new Date()
  var createdDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000))
    .toISOString()
    .split("T")[0]

  // First, remove current vote if exist
  // New vote with option

  const query = `
      DELETE FROM vote WHERE vote.user_id = ${ userId } and vote.article_a_id = '${ articleAId }' and vote.article_b_id = '${ articleBId }';
      INSERT INTO vote (article_a_id, article_b_id, voted_option, user_id, created_date)
      VALUES ('${ articleAId }', '${ articleBId }', ${ votedOption }, ${ userId }, '${ createdDate }')
    `
  console.log(query)
  await pool.query(query)
  const updateSimReport = await getSimRecordById(simReport.id)
  console.log(updateSimReport)
  response.status(200).json(updateSimReport)
}

export default {
  getSimilarityRecords,
  applyVote
}
