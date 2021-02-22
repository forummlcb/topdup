import API from '../../api';

export function getSimilarityRecords() {
  return API.get("/api/v1/similarity-reports")
    .then(result => result.data.map(item => ({
      ...item,
      sim_score: parseFloat(item['sim_score']).toFixed(3),
      sourceArticleNbVote: Math.round(Math.random() * 100),
      targetArticleNbVote: Math.round(Math.random() * 100),
    })));
}