/**
@file dateSim.sql
@params: $1: date string: In the form of `yyyy-mm-dd`.
    Eg: 2013-12-23
@return: all the pair with created date equal to the param date.

Given an article date, return a list of articles that is created on
that date (with blocks if necessary).
*/

SELECT * 
FROM article
WHERE created_date::date = '$1'