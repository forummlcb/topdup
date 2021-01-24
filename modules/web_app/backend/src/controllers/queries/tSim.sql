/**
@file tSim.sql
@params: $1: a float threshold value
@return: every fields of rows that have similarity >= t

Given a float threshold t, return a list of all pairs of articles that 
have the similarity score greater than t (with blocks if necessary).

Average query runtime: 83ms.
*/
SELECT *
FROM similarity_report
WHERE sim_score >= $1