/**
@file articleVote.sql
@params: $1: the id of the article needed to find.
@return: all fields of the related article pairs

Given an article id, return all the pairs where this article is in, 
with the vote count (positive and negative) from each unique user 
(with blocks if necessary).
*/
SELECT *
FROM vote
WHERE article_a_id = $1 OR article_b_id = $1