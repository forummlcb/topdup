import API from '../../api'

class DupReportService {
  getSimilarityRecords = (userId) => {
    return API.get(`/api/v1/similarity-reports?userId=${userId || ''}`)
      .then(result => result.data.map(item => ({
        ...item,
        sim_score: parseFloat(item['sim_score']).toFixed(3)
      })))
  }

  applyVote = (simReport, votedOption, userId) => {
    const simReportId = simReport.id
    const apiUrl = `api/v1/similarity-reports/${simReportId}/vote`
    return API.post(apiUrl, { votedOption, simReport, userId })
  }
}

export default DupReportService
