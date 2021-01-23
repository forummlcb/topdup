/**
@file greaterVote.sql

Given a number of vote `v`, return all users who have voted more than `v`.
*/
SELECT user_id, COUNT(user_id) AS cnt
FROM vote
GROUP BY user_id
HAVING COUNT(user_id) > $1