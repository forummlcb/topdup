import API from '../../api'
const queryString = require('query-string')

class DupReportService {
  getSimilarityRecords = (queryParam) => {
    // savedReportResult: { 
    //    response: { data: reports, message: message }, 
    //    queryParam: queryParam 
    // }

    const savedReportResult = window['savedReportResult'] || {}
    const savedQueryParam = savedReportResult.queryParam

    if (JSON.stringify(savedQueryParam) === JSON.stringify(queryParam)) {
      const response = savedReportResult.response
      return new Promise((resolve, reject) => resolve(response))
    }

    return API.get(`/api/v1/similarity-reports?${ queryString.stringify(queryParam) }`)
  }

  applyVote = (simReport, votedOption, userId) => {
    const simReportId = simReport.id
    const apiUrl = `api/v1/similarity-reports/${ simReportId }/vote`
    return API.post(apiUrl, { votedOption, simReport, userId })
  }
}

export default DupReportService
