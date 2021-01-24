/**
@file articleNVote.sql
@params: 
    $1: the id of the 1st article needed to find.
    $2: the id of the 2nd article needed to find.
@return: the vote count of the pair.

Given 2 article id, return the vote count of that pairs.
*/
SELECT COUNT(*) as cnt
FROM vote
WHERE (article_a_id = $1 AND article_b_id = $2)
    OR (article_b_id = $1 AND article_a_id = $2)