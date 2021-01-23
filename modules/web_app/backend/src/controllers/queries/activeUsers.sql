/**
@file activeUsers.sql
@params: $1: The top k users.
@return:
    user_id: the user_id.
    cnt: the vote count of that user id.

Given an integer k, return k top users that voted the most.
*/

SELECT user_id, COUNT(user_id) AS cnt
FROM vote
GROUP BY user_id
ORDER BY COUNT(user_id) DESC 
LIMIT $1