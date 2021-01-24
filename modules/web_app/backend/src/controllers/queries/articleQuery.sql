/**
@file articleQuery.sql
@params: 
    $1: the title of the article needed to find.
    $2: the domain of the article needed to find.
    $3: the author of the article needed to find.
@return: the found articles

Given parameters, return a list of query articles.
*/
SELECT * 
FROM article A
WHERE LOWER(A.title) LIKE LOWER('%$1%')
    AND LOWER(A.domain) LIKE LOWER('%$2%')
    AND LOWER(A.author) LIKE LOWER('%$3%')