/**
@file domainSim.sql
@params: $1: a domain string
@return: every articles that have the domain

Given a domain, return a list of all articles having
that domain (with blocks if necessary).
*/

SELECT * 
FROM article A
WHERE A.domain LIKE '$1'