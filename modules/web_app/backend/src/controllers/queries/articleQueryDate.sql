/**
@file articleQueryDate.sql
@params: 
    $1: the title of the article needed to find.
    $2: the domain of the article needed to find.
    $3: the author of the article needed to find.
    $4: start date string: In the form of `yyyy-mm-dd`. Eg: 2013-12-23
    $5: end date string: In the form of `yyyy-mm-dd`. Eg: 2022-12-23
@return: the found articles

Given parameters, return a list of query articles.
*/
SELECT * 
FROM article A
WHERE LOWER(A.title) LIKE LOWER('%$1%')
    AND LOWER(A.domain) LIKE LOWER('%$2%')
    AND LOWER(A.author) LIKE LOWER('%$3%')
    AND created_date::date >= '$4'
    AND created_date::date < '$5'