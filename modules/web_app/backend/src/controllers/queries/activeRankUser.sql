/**
@file activeRankUser.sql
@param: $1: the number r
@return: 
	user_id: the id of user
	count: the vote count

Given an integer r, return all users that voted the in the
top r most.
*/

SELECT V1.user_id, V1.cnt
FROM
(
	SELECT user_id, COUNT(user_id) AS cnt
	FROM vote V
	GROUP BY user_id
) AS V1
JOIN
(
	SELECT DISTINCT cnt FROM
	(
		SELECT user_id, COUNT(user_id) AS cnt
		FROM vote
		GROUP BY user_id
	) AS tmp
	ORDER BY cnt DESC
	LIMIT $1
) AS V2
ON V1.cnt = V2.cnt