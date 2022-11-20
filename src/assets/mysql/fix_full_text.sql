/* 
  mysql only, not supported mariadb
 */

ALTER TABLE `v2_twitter_tweets` DROP INDEX `full_text_origin`;

ALTER TABLE `v2_twitter_tweets` ADD FULLTEXT(`full_text_origin`) WITH parser ngram;