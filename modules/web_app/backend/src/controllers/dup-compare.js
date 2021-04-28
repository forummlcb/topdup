import { CODE } from "../constants/index.js"

const axios = require('axios')

const getCompareResults = async (request, response) => {
  console.log(request.body)
  const callCompareService = (sourceMode, sourceContent, targetMode, targetContent) => {
    const apiUrl = 'http://100.65.11.161:8000/compare/'
    const body = {
      pairs: [
        { mode: sourceMode, content: sourceContent },
        { mode: targetMode, content: targetContent }
      ]
    }
    return axios.post(apiUrl, body)
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
