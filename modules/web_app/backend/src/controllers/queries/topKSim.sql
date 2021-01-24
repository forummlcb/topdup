/**
@file topKSim.sql
@params: $1: a limit number
@return: every field of the top k similarity row

Given an integer k, return a list of k pairs of articles that 
have the highest similarity score.

Average query runtime: 50ms (seek + latency + 
    overhead) + k * 0.03ms (linear indexing)
*/
SELECT *
FROM similarity_report
ORDER BY sim_score DESC
LIMIT $1