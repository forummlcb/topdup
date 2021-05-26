import { CODE } from "../constants/index.js"

const axios = require('axios')

const getCompareResults = async (request, response) => {
  console.log(request.body)
  const callCompareService = (sourceMode, sourceContent, targetMode, targetContent) => {
    const apiUrl = process.env.ML_API_URL + '/compare/'
    const customHeaders = JSON.parse(process.env.ML_API_CUSTOM_HEADERS || '{}')
    const headers = { 'Content-Type': 'application/json' }
    Object.assign(headers, customHeaders)

    console.log(headers)

    const body = {
      pairs: [
        { mode: sourceMode, content: sourceContent },
        { mode: targetMode, content: targetContent }
      ]
    }

    return axios.post(apiUrl, body, { headers })
  }

  const compareOption = request.body
  const { sourceMode, sourceContent, targetMode, targetContent } = compareOption

  callCompareService(sourceMode, sourceContent, targetMode, targetContent)
    .then((result) => {
      response.status(CODE.SUCCESS).send(result.data)
    })
    .catch((error) => {
      next(Error(error))
    })
}

export default {
  getCompareResults
}
