/**
@file userVote.sql
@params: $1: an user id
@return: all fields of votes action of the given user.

Given an user id, return all the article pairs that this user has 
voted (with blocks if necessary).
*/
SELECT *
FROM vote
WHERE user_id = $1